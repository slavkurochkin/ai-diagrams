import { create } from 'zustand'
import { applyNodeChanges, applyEdgeChanges } from 'reactflow'
import type { Node, Edge, NodeChange, EdgeChange, Connection, NodePositionChange } from 'reactflow'
import type { BaseNodeData } from '../types/nodes'
import type { NotePlacement } from '../types/nodes'
import type { FlowContext } from '../types/flow'
import { buildDefaultConfig, getNodeDefinition } from '../lib/nodeDefinitions'

type Theme = 'dark' | 'light'
export type PlaybackPhase = 'idle' | 'before' | 'running' | 'after'
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
  /** When true, nodes/edges are not draggable or selectable — pan/zoom the canvas without moving frames. */
  canvasNodesLocked: boolean
  flowContext: FlowContext | null
  showExecutionPriorities: boolean
  showAllNotes: boolean
  hideNotesDuringPlayback: boolean
  isPlaybackRunning: boolean
  playbackPhase: PlaybackPhase
  activeCharacterHookNodeIds: string[]
  globalPathThickness: number
  globalPathColor: string
  gifCapturePaddingPercent: number

  // ── Graph mutations (React Flow-compatible) ───────────────────────────────
  setNodes: (nodes: Node<BaseNodeData>[]) => void
  setEdges: (edges: Edge[]) => void
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  addEdge: (connection: Connection, options?: { id?: string }) => void
  updateEdgePriority: (edgeId: string, priority: number) => void
  updateEdgeTravelSpeed: (edgeId: string, speed: number) => void
  updateEdgeThickness: (edgeId: string, thickness: number) => void
  updateEdgeColor: (edgeId: string, color?: string) => void

  // ── Node management ───────────────────────────────────────────────────────
  /** Adds a new node of the given type at the given canvas position. */
  addNode: (
    type: string,
    position: { x: number; y: number },
    initialConfig?: Record<string, string | number | boolean>,
    options?: { id?: string; label?: string },
  ) => void
  /** Renames the display label of a node. */
  updateNodeLabel: (nodeId: string, label: string) => void
  /** Deep-merges partial config into the node's data.config. */
  updateNodeConfig: (
    nodeId: string,
    config: Partial<Record<string, string | number | boolean>>,
    merge?: boolean,
  ) => void
  removeEdge: (edgeId: string) => void
  /** Removes a node and all its connected edges. */
  removeNode: (nodeId: string) => void
  /** Duplicates a node, offset by 30px, and selects the copy. */
  duplicateNode: (nodeId: string) => void
  /** Updates the markdown note attached to a node. */
  updateNodeNote: (nodeId: string, note: string) => void
  /** Updates this node instance's accent color. */
  updateNodeAccentColor: (nodeId: string, color?: string) => void
  /** Updates header/title text color on the node card (omit to use default white). */
  updateNodeHeaderTextColor: (nodeId: string, color?: string) => void
  /** Toggles whether the note is always visible. */
  toggleNodeNoteVisible: (nodeId: string) => void
  /** Updates where the note card is rendered around the node. */
  updateNodeNotePlacement: (nodeId: string, placement: NotePlacement) => void
  /** Sets or clears a port’s position along the edge (0–100). Pass `null` to remove override. */
  updateNodePortOffset: (nodeId: string, portId: string, percent: number | null) => void
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
  setPlaybackPhase: (phase: PlaybackPhase) => void
  setActiveCharacterHookNodeIds: (nodeIds: string[]) => void
  setGlobalPathThickness: (thickness: number) => void
  setGlobalPathColor: (color: string) => void
  setGifCapturePaddingPercent: (percent: number) => void

  // ── Presentation mode ─────────────────────────────────────────────────────
  togglePresentationMode: () => void
  toggleCanvasNodesLocked: () => void

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

  // ── Undo ──────────────────────────────────────────────────────────────────
  _history: Array<{ nodes: Node<BaseNodeData>[]; edges: Edge[] }>
  _isDragging: boolean
  undo: () => void
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
  canvasNodesLocked: false,
  compactMode: false,
  layoutDirection: 'TB',
  flowContext: null,
  showExecutionPriorities: false,
  showAllNotes: false,
  hideNotesDuringPlayback: false,
  isPlaybackRunning: false,
  playbackPhase: 'idle',
  activeCharacterHookNodeIds: [],
  globalPathThickness: 1,
  globalPathColor: '#FFFFFF',
  gifCapturePaddingPercent: 10,
  _history: [],
  _isDragging: false,

  // ── Setters (used by load/restore) ────────────────────────────────────────
  setNodes: (nodes) => set({ nodes, _history: [], _isDragging: false }),
  setEdges: (edges) => set({ edges }),

  // ── React Flow change handlers ────────────────────────────────────────────
  onNodesChange: (changes) => {
    set((state) => {
      const posChanges = changes.filter((c): c is NodePositionChange => c.type === 'position')
      const hasRemove = changes.some((c) => c.type === 'remove')

      let { _history, _isDragging } = state

      // Snapshot before drag starts
      if (!_isDragging && posChanges.some((c) => c.dragging)) {
        _history = [..._history.slice(-49), { nodes: state.nodes, edges: state.edges }]
        _isDragging = true
      } else if (_isDragging && posChanges.length > 0 && posChanges.every((c) => !c.dragging)) {
        _isDragging = false
      }

      // Snapshot before node removal
      if (hasRemove) {
        _history = [..._history.slice(-49), { nodes: state.nodes, edges: state.edges }]
      }

      return {
        nodes: applyNodeChanges(changes, state.nodes) as Node<BaseNodeData>[],
        _history,
        _isDragging,
      }
    })
  },

  onEdgesChange: (changes) => {
    set((state) => {
      const hasRemove = changes.some((c) => c.type === 'remove')
      const _history = hasRemove
        ? [...state._history.slice(-49), { nodes: state.nodes, edges: state.edges }]
        : state._history
      return {
        edges: applyEdgeChanges(changes, state.edges),
        _history,
      }
    })
  },

  addEdge: (connection, options) => {
    set((state) => {
      const customId = options?.id?.trim()
      if (customId && state.edges.some((e) => e.id === customId)) return state

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
        id:
          customId ||
          `edge-${connection.source}-${connection.sourceHandle ?? 'out'}-${connection.target}-${connection.targetHandle ?? 'in'}-${Date.now()}`,
        source: connection.source ?? '',
        target: connection.target ?? '',
        sourceHandle: connection.sourceHandle ?? null,
        targetHandle: connection.targetHandle ?? null,
        type: 'smoothstep',
        data: { executionPriority: 1, travelSpeed: 1, pathThickness: 1 },
      }
      return {
        edges: [...state.edges, newEdge],
        _history: [...state._history.slice(-49), { nodes: state.nodes, edges: state.edges }],
      }
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
  addNode: (type, position, initialConfig, options) => {
    const def = getNodeDefinition(type)
    if (!def) {
      console.warn(`[AgentFlow] Unknown node type: "${type}"`)
      return
    }

    const customId = options?.id?.trim()
    const defaultConfig = buildDefaultConfig(type)
    const mergedConfig = initialConfig ? { ...defaultConfig, ...initialConfig } : defaultConfig
    const isFrameNode = type === 'frame'
    const sizedStyle = getSizedNodeStyle(type, mergedConfig)

    set((state) => {
      if (customId && state.nodes.some((n) => n.id === customId)) {
        console.warn(`[AgentFlow] addNode: id already exists: ${customId}`)
        return state
      }
      const id = customId || generateNodeId(type)
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
          label: options?.label?.trim() ? options.label.trim() : def.label,
          config: mergedConfig,
          animationState: 'idle',
        },
      }
      return {
        nodes: [...state.nodes, newNode],
        _history: [...state._history.slice(-49), { nodes: state.nodes, edges: state.edges }],
      }
    })
  },

  removeEdge: (edgeId) => {
    set((state) => ({
      edges: state.edges.filter((e) => e.id !== edgeId),
      selectedEdgeId: state.selectedEdgeId === edgeId ? null : state.selectedEdgeId,
      _history: [...state._history.slice(-49), { nodes: state.nodes, edges: state.edges }],
    }))
  },

  updateNodeLabel: (nodeId, label) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, label } } : node,
      ),
    }))
  },

  updateNodeConfig: (nodeId, config, merge = true) => {
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id !== nodeId) return node
        const nodeType = node.type ?? node.data.nodeType
        const def = getNodeDefinition(nodeType)
        const base = def ? buildDefaultConfig(nodeType) : ({} as Record<string, string | number | boolean>)
        const nextConfig = merge
          ? ({ ...node.data.config, ...config } as Record<string, string | number | boolean>)
          : ({ ...base, ...config } as Record<string, string | number | boolean>)
        return {
          ...node,
          data: {
            ...node.data,
            config: nextConfig,
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

  updateNodeHeaderTextColor: (nodeId, headerTextColor) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              data: {
                ...n.data,
                ...(headerTextColor && headerTextColor.trim()
                  ? { headerTextColor: headerTextColor.trim() }
                  : { headerTextColor: undefined }),
              },
            }
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

  updateNodePortOffset: (nodeId, portId, percent) => {
    set((state) => ({
      nodes: state.nodes.map((n) => {
        if (n.id !== nodeId) return n
        const next = { ...(n.data.portOffsets ?? {}) }
        if (percent === null) delete next[portId]
        else next[portId] = percent
        const portOffsets = Object.keys(next).length > 0 ? next : undefined
        return { ...n, data: { ...n.data, portOffsets } }
      }),
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
      _history: [...state._history.slice(-49), { nodes: state.nodes, edges: state.edges }],
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
  setPlaybackPhase: (playbackPhase) => set({ playbackPhase }),
  setActiveCharacterHookNodeIds: (activeCharacterHookNodeIds) => set({ activeCharacterHookNodeIds }),
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
  setGifCapturePaddingPercent: (percent) => {
    const safePercent = Math.max(0, Math.min(40, Number.isFinite(percent) ? percent : 10))
    set({ gifCapturePaddingPercent: Math.round(safePercent) })
  },

  // ── Presentation mode ─────────────────────────────────────────────────────
  togglePresentationMode: () =>
    set((state) => ({ presentationMode: !state.presentationMode })),

  toggleCanvasNodesLocked: () =>
    set((state) => {
      const locked = !state.canvasNodesLocked
      if (!locked) return { canvasNodesLocked: false }
      return {
        canvasNodesLocked: true,
        selectedNodeId: null,
        selectedEdgeId: null,
        nodes: state.nodes.map((n) => ({ ...n, selected: false })),
        edges: state.edges.map((e) => ({ ...e, selected: false })),
      }
    }),

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

  // ── Undo ──────────────────────────────────────────────────────────────────
  undo: () => {
    set((state) => {
      if (state._history.length === 0) return state
      const prev = state._history[state._history.length - 1]
      return {
        nodes: prev.nodes,
        edges: prev.edges,
        _history: state._history.slice(0, -1),
        _isDragging: false,
        selectedNodeId: null,
        selectedEdgeId: null,
      }
    })
  },
}))

// ── Selector helpers (memoization-friendly) ───────────────────────────────────

export const selectNodes = (s: FlowStore) => s.nodes
export const selectEdges = (s: FlowStore) => s.edges
export const selectSelectedNodeId = (s: FlowStore) => s.selectedNodeId
export const selectSelectedEdgeId = (s: FlowStore) => s.selectedEdgeId
export const selectTheme = (s: FlowStore) => s.theme
