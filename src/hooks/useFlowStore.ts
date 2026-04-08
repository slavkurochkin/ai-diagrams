import { create } from 'zustand'
import { applyNodeChanges, applyEdgeChanges } from 'reactflow'
import type { Node, Edge, NodeChange, EdgeChange, Connection } from 'reactflow'
import type { BaseNodeData } from '../types/nodes'
import type { NotePlacement } from '../types/nodes'
import type { FlowContext } from '../types/flow'
import { buildDefaultConfig, getNodeDefinition } from '../lib/nodeDefinitions'

type Theme = 'dark' | 'light'
const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

interface FlowStore {
  // ── State ────────────────────────────────────────────────────────────────
  nodes: Node<BaseNodeData>[]
  edges: Edge[]
  selectedNodeId: string | null
  selectedEdgeId: string | null
  theme: Theme
  flowName: string
  presentationMode: boolean
  flowContext: FlowContext | null
  showExecutionPriorities: boolean
  showAllNotes: boolean
  hideNotesDuringPlayback: boolean
  isPlaybackRunning: boolean
  globalPathThickness: number
  globalPathColor: string

  // ── Graph mutations (React Flow-compatible) ───────────────────────────────
  setNodes: (nodes: Node<BaseNodeData>[]) => void
  setEdges: (edges: Edge[]) => void
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  addEdge: (connection: Connection) => void
  updateEdgePriority: (edgeId: string, priority: number) => void
  updateEdgeTravelSpeed: (edgeId: string, speed: number) => void
  updateEdgeThickness: (edgeId: string, thickness: number) => void
  updateEdgeColor: (edgeId: string, color?: string) => void

  // ── Node management ───────────────────────────────────────────────────────
  /** Adds a new node of the given type at the given canvas position. */
  addNode: (type: string, position: { x: number; y: number }) => void
  /** Deep-merges partial config into the node's data.config. */
  updateNodeConfig: (nodeId: string, config: Partial<Record<string, string | number | boolean>>) => void
  /** Removes a node and all its connected edges. */
  removeNode: (nodeId: string) => void
  /** Duplicates a node, offset by 30px, and selects the copy. */
  duplicateNode: (nodeId: string) => void
  /** Updates the markdown note attached to a node. */
  updateNodeNote: (nodeId: string, note: string) => void
  /** Updates this node instance's accent color. */
  updateNodeAccentColor: (nodeId: string, color?: string) => void
  /** Toggles whether the note is always visible. */
  toggleNodeNoteVisible: (nodeId: string) => void
  /** Updates where the note card is rendered around the node. */
  updateNodeNotePlacement: (nodeId: string, placement: NotePlacement) => void
  /** Creates a frame node around currently selected nodes. */
  createFrameFromSelection: () => boolean
  /** Moves a frame above all other frames (while still behind regular nodes). */
  bringFrameToFront: (nodeId: string) => void
  /** Moves a frame below all other frames. */
  sendFrameToBack: (nodeId: string) => void

  // ── Selection ─────────────────────────────────────────────────────────────
  setSelectedNode: (nodeId: string | null) => void
  setSelectedEdge: (edgeId: string | null) => void

  // ── Theme ─────────────────────────────────────────────────────────────────
  setTheme: (theme: Theme) => void

  // ── Flow metadata ─────────────────────────────────────────────────────────
  setFlowName: (name: string) => void
  setFlowContext: (context: FlowContext | null) => void
  toggleExecutionPriorities: () => void
  toggleShowAllNotes: () => void
  toggleHideNotesDuringPlayback: () => void
  setPlaybackRunning: (running: boolean) => void
  setGlobalPathThickness: (thickness: number) => void
  setGlobalPathColor: (color: string) => void

  // ── Presentation mode ─────────────────────────────────────────────────────
  togglePresentationMode: () => void

  // ── Compact mode ──────────────────────────────────────────────────────────
  compactMode: boolean
  toggleCompactMode: () => void

  // ── Layout direction ──────────────────────────────────────────────────────
  layoutDirection: 'TB' | 'LR'
  setLayoutDirection: (dir: 'TB' | 'LR') => void

  // ── Animation state ───────────────────────────────────────────────────────
  /** Sets the animation state of a single node. */
  setNodeAnimationState: (
    nodeId: string,
    state: BaseNodeData['animationState'],
  ) => void
  /** Resets all nodes back to 'idle'. */
  resetAllAnimationStates: () => void
}

let nodeCounter = 1
const DEFAULT_NODE_WIDTH = 220
const DEFAULT_NODE_HEIGHT = 110
const GROUP_FRAME_PADDING_X = 48
const GROUP_FRAME_PADDING_Y = 56

function generateNodeId(type: string): string {
  return `${type}-${nodeCounter++}`
}

function getFrameDimension(value: string | number | boolean | undefined, fallback: number) {
  return typeof value === 'number' ? value : fallback
}

function getSizedNodeStyle(type: string, config: Record<string, string | number | boolean>) {
  if (type === 'frame') {
    return {
      width: getFrameDimension(config.width, 420),
      height: getFrameDimension(config.height, 260),
    }
  }
  if (type === 'text') {
    return {
      width: getFrameDimension(config.width, 320),
      height: getFrameDimension(config.height, 160),
    }
  }
  return undefined
}

function getNodeDimension(
  node: Node<BaseNodeData>,
  key: 'width' | 'height',
  fallback: number,
): number {
  const measured = node[key]
  if (typeof measured === 'number' && Number.isFinite(measured)) return measured

  const styled = (node.style?.[key] as number | undefined)
  if (typeof styled === 'number' && Number.isFinite(styled)) return styled

  const cfg = node.data?.config?.[key]
  if (typeof cfg === 'number' && Number.isFinite(cfg)) return cfg

  return fallback
}

function getFrameZIndex(node: Node<BaseNodeData>): number {
  if (typeof node.zIndex === 'number' && Number.isFinite(node.zIndex)) {
    return Math.min(-1, Math.floor(node.zIndex))
  }
  return -1
}

export const useFlowStore = create<FlowStore>((set) => ({
  // ── Initial state ─────────────────────────────────────────────────────────
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  theme: 'dark',
  flowName: 'Untitled Flow',
  presentationMode: false,
  compactMode: false,
  layoutDirection: 'TB',
  flowContext: null,
  showExecutionPriorities: false,
  showAllNotes: false,
  hideNotesDuringPlayback: false,
  isPlaybackRunning: false,
  globalPathThickness: 1,
  globalPathColor: '#FFFFFF',

  // ── Setters (used by load/restore) ────────────────────────────────────────
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  // ── React Flow change handlers ────────────────────────────────────────────
  onNodesChange: (changes) => {
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes) as Node<BaseNodeData>[],
    }))
  },

  onEdgesChange: (changes) => {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
    }))
  },

  addEdge: (connection) => {
    set((state) => {
      // Prevent duplicate edges for the same source handle → target handle
      const exists = state.edges.some(
        (e) =>
          e.source === connection.source &&
          e.target === connection.target &&
          e.sourceHandle === connection.sourceHandle &&
          e.targetHandle === connection.targetHandle,
      )
      if (exists) return state

      const newEdge: Edge = {
        id: `edge-${connection.source}-${connection.sourceHandle ?? 'out'}-${connection.target}-${connection.targetHandle ?? 'in'}-${Date.now()}`,
        source: connection.source ?? '',
        target: connection.target ?? '',
        sourceHandle: connection.sourceHandle ?? null,
        targetHandle: connection.targetHandle ?? null,
        type: 'smoothstep',
        data: { executionPriority: 1, travelSpeed: 1, pathThickness: 1 },
      }
      return { edges: [...state.edges, newEdge] }
    })
  },

  updateEdgePriority: (edgeId, priority) => {
    const nextPriority = Math.max(1, Math.floor(priority) || 1)
    set((state) => ({
      edges: state.edges.map((edge) =>
        edge.id === edgeId
          ? {
              ...edge,
              data: { ...(edge.data ?? {}), executionPriority: nextPriority },
            }
          : edge,
      ),
    }))
  },

  updateEdgeTravelSpeed: (edgeId, speed) => {
    const nextSpeed = Math.max(0.25, Math.min(3, Number.isFinite(speed) ? speed : 1))
    set((state) => ({
      edges: state.edges.map((edge) =>
        edge.id === edgeId
          ? {
              ...edge,
              data: { ...(edge.data ?? {}), travelSpeed: Number(nextSpeed.toFixed(2)) },
            }
          : edge,
      ),
    }))
  },

  updateEdgeThickness: (edgeId, thickness) => {
    const nextThickness = Math.max(0.5, Math.min(4, Number.isFinite(thickness) ? thickness : 1))
    set((state) => ({
      edges: state.edges.map((edge) =>
        edge.id === edgeId
          ? {
              ...edge,
              data: { ...(edge.data ?? {}), pathThickness: Number(nextThickness.toFixed(2)) },
            }
          : edge,
      ),
    }))
  },

  updateEdgeColor: (edgeId, color) => {
    const trimmed = typeof color === 'string' ? color.trim() : ''
    const safeColor = HEX_COLOR_RE.test(trimmed) ? trimmed : undefined
    set((state) => ({
      edges: state.edges.map((edge) =>
        edge.id === edgeId
          ? {
              ...edge,
              data: { ...(edge.data ?? {}), pathColor: safeColor },
            }
          : edge,
      ),
    }))
  },

  // ── Node management ───────────────────────────────────────────────────────
  addNode: (type, position) => {
    const def = getNodeDefinition(type)
    if (!def) {
      console.warn(`[AgentFlow] Unknown node type: "${type}"`)
      return
    }

    const id = generateNodeId(type)
    const defaultConfig = buildDefaultConfig(type)
    const isFrameNode = type === 'frame'
    const sizedStyle = getSizedNodeStyle(type, defaultConfig)
    const newNode: Node<BaseNodeData> = {
      id,
      type,
      position,
      ...(isFrameNode || sizedStyle
        ? {
            ...(isFrameNode ? { zIndex: -1 } : {}),
            ...(sizedStyle ? { style: sizedStyle } : {}),
          }
        : {}),
      data: {
        nodeType: type,
        label: def.label,
        config: defaultConfig,
        animationState: 'idle',
      },
    }

    set((state) => ({ nodes: [...state.nodes, newNode] }))
  },

  updateNodeConfig: (nodeId, config) => {
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id !== nodeId) return node
        return {
          ...node,
          data: {
            ...node.data,
            config: { ...node.data.config, ...config } as Record<string, string | number | boolean>,
          },
        }
      }),
    }))
  },

  updateNodeNote: (nodeId, note) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, note } } : n,
      ),
    }))
  },

  updateNodeAccentColor: (nodeId, accentColor) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, ...(accentColor ? { accentColor } : { accentColor: undefined }) } }
          : n,
      ),
    }))
  },

  toggleNodeNoteVisible: (nodeId) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, noteAlwaysVisible: !n.data.noteAlwaysVisible } }
          : n,
      ),
    }))
  },

  updateNodeNotePlacement: (nodeId, notePlacement) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, notePlacement } } : n,
      ),
    }))
  },

  createFrameFromSelection: () => {
    let created = false

    set((state) => {
      const selectedNodes = state.nodes.filter((n) => n.selected && n.type !== 'frame')
      if (selectedNodes.length === 0) return state

      let minX = Number.POSITIVE_INFINITY
      let minY = Number.POSITIVE_INFINITY
      let maxX = Number.NEGATIVE_INFINITY
      let maxY = Number.NEGATIVE_INFINITY

      for (const node of selectedNodes) {
        const width = getNodeDimension(node, 'width', DEFAULT_NODE_WIDTH)
        const height = getNodeDimension(node, 'height', DEFAULT_NODE_HEIGHT)
        minX = Math.min(minX, node.position.x)
        minY = Math.min(minY, node.position.y)
        maxX = Math.max(maxX, node.position.x + width)
        maxY = Math.max(maxY, node.position.y + height)
      }

      const frameX = Math.round(minX - GROUP_FRAME_PADDING_X)
      const frameY = Math.round(minY - GROUP_FRAME_PADDING_Y)
      const frameWidth = Math.round(Math.max(180, (maxX - minX) + GROUP_FRAME_PADDING_X * 2))
      const frameHeight = Math.round(Math.max(120, (maxY - minY) + GROUP_FRAME_PADDING_Y * 2))
      const frameId = generateNodeId('frame')
      const frameConfig = {
        ...buildDefaultConfig('frame'),
        title: selectedNodes.length > 1 ? `Group (${selectedNodes.length})` : 'Group',
        width: frameWidth,
        height: frameHeight,
      } as Record<string, string | number | boolean>

      const frameNode: Node<BaseNodeData> = {
        id: frameId,
        type: 'frame',
        position: { x: frameX, y: frameY },
        zIndex: -1,
        style: { width: frameWidth, height: frameHeight },
        selected: true,
        data: {
          nodeType: 'frame',
          label: 'Frame',
          animationState: 'idle',
          config: frameConfig,
          accentColor: '#2664e8',
        },
      }

      created = true
      return {
        ...state,
        nodes: [
          ...state.nodes.map((n) => ({ ...n, selected: false })),
          frameNode,
        ],
        selectedNodeId: frameId,
        selectedEdgeId: null,
      }
    })

    return created
  },

  bringFrameToFront: (nodeId) => {
    set((state) => {
      const target = state.nodes.find((n) => n.id === nodeId && n.type === 'frame')
      if (!target) return state
      const targetZ = getFrameZIndex(target)

      return {
        ...state,
        nodes: state.nodes.map((node) => {
          if (node.type !== 'frame') return node
          const z = getFrameZIndex(node)
          if (node.id === nodeId) return { ...node, zIndex: -1 }
          if (z >= targetZ) return { ...node, zIndex: z - 1 }
          return node
        }),
      }
    })
  },

  sendFrameToBack: (nodeId) => {
    set((state) => {
      const target = state.nodes.find((n) => n.id === nodeId && n.type === 'frame')
      if (!target) return state
      const frameZValues = state.nodes
        .filter((n) => n.type === 'frame')
        .map((n) => getFrameZIndex(n))
      const minZ = frameZValues.length > 0 ? Math.min(...frameZValues) : -1

      return {
        ...state,
        nodes: state.nodes.map((node) =>
          node.id === nodeId
            ? { ...node, zIndex: minZ - 1 }
            : node,
        ),
      }
    })
  },

  removeNode: (nodeId) => {
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId,
      ),
      selectedNodeId:
        state.selectedNodeId === nodeId ? null : state.selectedNodeId,
    }))
  },

  duplicateNode: (nodeId) => {
    set((state) => {
      const original = state.nodes.find((n) => n.id === nodeId)
      if (!original) return state
      const newId = `${original.type}-${nodeCounter++}`
      const copy: Node<BaseNodeData> = {
        ...original,
        id: newId,
        position: { x: original.position.x + 40, y: original.position.y + 40 },
        selected: false,
        data: { ...original.data, animationState: 'idle' },
      }
      return { nodes: [...state.nodes, copy], selectedNodeId: newId }
    })
  },

  // ── Selection ─────────────────────────────────────────────────────────────
  setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId }),
  setSelectedEdge: (edgeId) => set({ selectedEdgeId: edgeId }),

  // ── Theme ─────────────────────────────────────────────────────────────────
  setTheme: (theme) => set({ theme }),

  // ── Flow metadata ─────────────────────────────────────────────────────────
  setFlowName: (flowName) => set({ flowName }),
  setFlowContext: (flowContext) => set({ flowContext }),
  toggleExecutionPriorities: () =>
    set((state) => ({ showExecutionPriorities: !state.showExecutionPriorities })),
  toggleShowAllNotes: () =>
    set((state) => ({ showAllNotes: !state.showAllNotes })),
  toggleHideNotesDuringPlayback: () =>
    set((state) => ({ hideNotesDuringPlayback: !state.hideNotesDuringPlayback })),
  setPlaybackRunning: (isPlaybackRunning) => set({ isPlaybackRunning }),
  setGlobalPathThickness: (thickness) => {
    const nextThickness = Math.max(0.5, Math.min(4, Number.isFinite(thickness) ? thickness : 1))
    set({ globalPathThickness: Number(nextThickness.toFixed(2)) })
  },
  setGlobalPathColor: (color) => {
    if (typeof color !== 'string') return
    const trimmed = color.trim()
    if (!HEX_COLOR_RE.test(trimmed)) return
    set({ globalPathColor: trimmed })
  },

  // ── Presentation mode ─────────────────────────────────────────────────────
  togglePresentationMode: () =>
    set((state) => ({ presentationMode: !state.presentationMode })),

  toggleCompactMode: () =>
    set((state) => ({ compactMode: !state.compactMode })),

  setLayoutDirection: (layoutDirection) => set({ layoutDirection }),

  // ── Animation state ───────────────────────────────────────────────────────
  setNodeAnimationState: (nodeId, animState) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, animationState: animState } }
          : n,
      ),
    }))
  },

  resetAllAnimationStates: () => {
    set((state) => ({
      nodes: state.nodes.map((n) => ({
        ...n,
        data: { ...n.data, animationState: 'idle' as const },
      })),
    }))
  },
}))

// ── Selector helpers (memoization-friendly) ───────────────────────────────────

export const selectNodes = (s: FlowStore) => s.nodes
export const selectEdges = (s: FlowStore) => s.edges
export const selectSelectedNodeId = (s: FlowStore) => s.selectedNodeId
export const selectSelectedEdgeId = (s: FlowStore) => s.selectedEdgeId
export const selectTheme = (s: FlowStore) => s.theme
