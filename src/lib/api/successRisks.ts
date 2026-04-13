import type { Node, Edge } from 'reactflow'
import type { BaseNodeData } from '../../types/nodes'
import type { FlowContext } from '../../types/flow'
import { filterGraphForAI } from '../aiGraphFilter'
import { resolveNeighborhood } from '../nodeNeighborhood'

// ── SSE reader ────────────────────────────────────────────────────────────────

async function readSSEStream(
  response: Response,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (msg: string) => void,
): Promise<void> {
  if (!response.ok || !response.body) {
    onError(`Server error ${response.status}`)
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const raw = line.slice(6).trim()
      if (raw === '[DONE]') { onDone(); return }
      try {
        const parsed = JSON.parse(raw) as { text?: string; error?: string }
        if (parsed.error) { onError(parsed.error); return }
        if (parsed.text) onChunk(parsed.text)
      } catch { /* malformed SSE line */ }
    }
  }

  onDone()
}

// ── Serialise graph ───────────────────────────────────────────────────────────

function serializeGraph(nodes: Node<BaseNodeData>[], edges: Edge[]) {
  const { nodes: aiNodes, edges: aiEdges } = filterGraphForAI(nodes, edges)
  return {
    nodes: aiNodes.map((n) => ({
      id: n.id,
      nodeType: n.data.nodeType,
      label: n.data.label,
      config: n.data.config ?? {},
    })),
    edges: aiEdges.map((e) => ({
      id: e.id,
      source: e.source,
      sourceHandle: e.sourceHandle ?? null,
      target: e.target,
      targetHandle: e.targetHandle ?? null,
    })),
  }
}

// ── Success Criteria ──────────────────────────────────────────────────────────

export async function streamSuccessCriteria(
  nodes: Node<BaseNodeData>[],
  edges: Edge[],
  flowName: string,
  flowContext: FlowContext | null,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (msg: string) => void,
  nodeId?: string,
): Promise<void> {
  const { nodes: serializedNodes, edges: serializedEdges } = serializeGraph(nodes, edges)

  const neighborhood = nodeId
    ? resolveNeighborhood(nodeId, nodes, edges)
    : null

  const payload = {
    flowName,
    flowContext: flowContext ?? null,
    nodes: serializedNodes,
    edges: serializedEdges,
    neighborhood: neighborhood ?? null,
  }

  try {
    const response = await fetch('/api/success-criteria', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    await readSSEStream(response, onChunk, onDone, onError)
  } catch (err) {
    onError(err instanceof Error ? err.message : 'Unexpected error')
  }
}

// ── Risk Analysis ─────────────────────────────────────────────────────────────

export async function streamRiskAnalysis(
  nodes: Node<BaseNodeData>[],
  edges: Edge[],
  flowName: string,
  flowContext: FlowContext | null,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (msg: string) => void,
  nodeId?: string,
): Promise<void> {
  const { nodes: serializedNodes, edges: serializedEdges } = serializeGraph(nodes, edges)

  const neighborhood = nodeId
    ? resolveNeighborhood(nodeId, nodes, edges)
    : null

  const payload = {
    flowName,
    flowContext: flowContext ?? null,
    nodes: serializedNodes,
    edges: serializedEdges,
    neighborhood: neighborhood ?? null,
  }

  try {
    const response = await fetch('/api/risk-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    await readSSEStream(response, onChunk, onDone, onError)
  } catch (err) {
    onError(err instanceof Error ? err.message : 'Unexpected error')
  }
}
