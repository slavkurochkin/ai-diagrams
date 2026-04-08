import type { Node, Edge } from 'reactflow'
import type { FlowDocument, FlowViewport, FlowContext } from '../types/flow'
import type { BaseNodeData } from '../types/nodes'

const STORAGE_KEY = 'agentflow:document'
const SCHEMA_VERSION = '1.0.0'

// ── Save ──────────────────────────────────────────────────────────────────────

export function saveFlow(
  nodes: Node<BaseNodeData>[],
  edges: Edge[],
  viewport: FlowViewport,
  name = 'Untitled Flow',
  flowContext?: FlowContext | null,
  layoutDirection?: 'TB' | 'LR',
): void {
  const roundedNodes = nodes.map((n) => ({
    ...n,
    position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
  }))
  const doc: FlowDocument = {
    version: SCHEMA_VERSION,
    name,
    savedAt: new Date().toISOString(),
    nodes: roundedNodes,
    edges,
    viewport,
    ...(layoutDirection ? { layoutDirection } : {}),
    ...(flowContext ? { flowContext } : {}),
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(doc))
  } catch (err) {
    console.error('[AgentFlow] Failed to save flow to localStorage:', err)
    throw err
  }
}

// ── Load ──────────────────────────────────────────────────────────────────────

export function loadFlow(): FlowDocument | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const doc = JSON.parse(raw) as FlowDocument

    // Basic schema validation
    if (typeof doc.version !== 'string') {
      console.warn('[AgentFlow] Loaded document missing version field.')
    }
    if (!Array.isArray(doc.nodes) || !Array.isArray(doc.edges)) {
      console.error('[AgentFlow] Loaded document has invalid nodes/edges.')
      return null
    }

    return doc
  } catch (err) {
    console.error('[AgentFlow] Failed to load flow from localStorage:', err)
    return null
  }
}

// ── Clear ─────────────────────────────────────────────────────────────────────

export function clearSavedFlow(): void {
  localStorage.removeItem(STORAGE_KEY)
}

// ── Export to JSON file ───────────────────────────────────────────────────────

export function exportFlowAsFile(
  nodes: Node<BaseNodeData>[],
  edges: Edge[],
  viewport: FlowViewport,
  name = 'agentflow',
  flowContext?: FlowContext | null,
): void {
  const doc: FlowDocument = {
    version: SCHEMA_VERSION,
    name,
    savedAt: new Date().toISOString(),
    nodes,
    edges,
    viewport,
    ...(flowContext ? { flowContext } : {}),
  }

  const blob = new Blob([JSON.stringify(doc, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const ts = new Date().toISOString().slice(0, 10)
  a.download = `${name.toLowerCase().replace(/\s+/g, '-')}-${ts}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Import from JSON string ───────────────────────────────────────────────────

export function importFlowFromJSON(json: string): FlowDocument | null {
  try {
    const doc = JSON.parse(json) as FlowDocument
    if (!Array.isArray(doc.nodes) || !Array.isArray(doc.edges)) {
      throw new Error('Invalid flow document structure')
    }
    return doc
  } catch (err) {
    console.error('[AgentFlow] Failed to import flow JSON:', err)
    return null
  }
}
