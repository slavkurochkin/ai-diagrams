import type { Node, Edge } from 'reactflow'
import type { BaseNodeData } from './nodes'

// ── Flow context ──────────────────────────────────────────────────────────────

export interface FlowContextDocument {
  id: string
  /** Short label like "Policy doc" or "SLA requirements" */
  name: string
  /** Raw text content — pasted or read from file */
  content: string
}

export interface FlowContext {
  /** What the agent does (purpose / goal) */
  description: string
  /** Architecture description — inputs, outputs, key decisions, edge cases */
  howItWorks: string
  /** Attached business / reference documents */
  documents: FlowContextDocument[]
}

// ── Serializable document ─────────────────────────────────────────────────────

export interface FlowDocument {
  /** Schema version for forward-compatibility */
  version: string
  /** Human-readable name of the flow */
  name: string
  /** ISO timestamp of last save */
  savedAt: string
  /** React Flow node list — positions, types, and config data */
  nodes: Node<BaseNodeData>[]
  /** React Flow edge list */
  edges: Edge[]
  /** Viewport to restore on load */
  viewport: {
    x: number
    y: number
    zoom: number
  }
  /** User-provided agent context and business documents */
  flowContext?: FlowContext
  /** Layout direction used when the flow was saved */
  layoutDirection?: 'TB' | 'LR'
  /** User-defined metadata */
  metadata?: Record<string, string>
}

// ── Runtime store shape (partial, for type reference) ────────────────────────

export interface FlowViewport {
  x: number
  y: number
  zoom: number
}
