import { create } from 'zustand'
import { applyNodeChanges, applyEdgeChanges } from 'reactflow'
import type { Node, Edge, NodeChange, EdgeChange, Connection } from 'reactflow'
import type { BaseNodeData } from '../types/nodes'
import type { NotePlacement } from '../types/nodes'
import type { FlowContext } from '../types/flow'
import { buildDefaultConfig, getNodeDefinition } from '../lib/nodeDefinitions'

type Theme = 'dark' | 'light'

interface FlowStore {
  // ── State ────────────────────────────────────────────────────────────────
  nodes: Node<BaseNodeData>[]
  edges: Edge[]
  selectedNodeId: string | null
  theme: Theme
  flowName: string
  presentationMode: boolean
  flowContext: FlowContext | null

  // ── Graph mutations (React Flow-compatible) ───────────────────────────────
  setNodes: (nodes: Node<BaseNodeData>[]) => void
  setEdges: (edges: Edge[]) => void
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  addEdge: (connection: Connection) => void

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

  // ── Selection ─────────────────────────────────────────────────────────────
  setSelectedNode: (nodeId: string | null) => void

  // ── Theme ─────────────────────────────────────────────────────────────────
  setTheme: (theme: Theme) => void

  // ── Flow metadata ─────────────────────────────────────────────────────────
  setFlowName: (name: string) => void
  setFlowContext: (context: FlowContext | null) => void

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

export const useFlowStore = create<FlowStore>((set) => ({
  // ── Initial state ─────────────────────────────────────────────────────────
  nodes: [],
  edges: [],
  selectedNodeId: null,
  theme: 'dark',
  flowName: 'Untitled Flow',
  presentationMode: false,
  compactMode: false,
  layoutDirection: 'TB',
  flowContext: null,

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
      }
      return { edges: [...state.edges, newEdge] }
    })
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

  // ── Theme ─────────────────────────────────────────────────────────────────
  setTheme: (theme) => set({ theme }),

  // ── Flow metadata ─────────────────────────────────────────────────────────
  setFlowName: (flowName) => set({ flowName }),
  setFlowContext: (flowContext) => set({ flowContext }),

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
export const selectTheme = (s: FlowStore) => s.theme
