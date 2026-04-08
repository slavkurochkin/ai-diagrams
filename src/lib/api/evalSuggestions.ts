import type { Node, Edge } from 'reactflow'
import type { BaseNodeData } from '../../types/nodes'
import type { FlowContext } from '../../types/flow'

// ── Request payload ────────────────────────────────────────────────────────────

const MAX_NOTE_CHARS = 4000

function serializePayload(
  nodes: Node<BaseNodeData>[],
  edges: Edge[],
  flowName: string,
  flowContext: FlowContext | null,
) {
  return {
    flowName,
    nodes: nodes.map((n) => {
      const rawNote = typeof n.data.note === 'string' ? n.data.note.trim() : ''
      const note =
        rawNote.length > MAX_NOTE_CHARS
          ? `${rawNote.slice(0, MAX_NOTE_CHARS)}…`
          : rawNote || undefined
      return {
        id: n.id,
        nodeType: n.data.nodeType,
        label: n.data.label,
        config: n.data.config ?? {},
        ...(note ? { note } : {}),
      }
    }),
    edges: edges.map((e) => {
      const d = e.data as
        | {
            executionPriority?: number
            travelSpeed?: number
            pathThickness?: number
            pathColor?: string
          }
        | undefined
      return {
        id: e.id,
        source: e.source,
        sourceHandle: e.sourceHandle ?? null,
        target: e.target,
        targetHandle: e.targetHandle ?? null,
        ...(typeof d?.executionPriority === 'number'
          ? { executionPriority: d.executionPriority }
          : {}),
        ...(typeof d?.travelSpeed === 'number' ? { travelSpeed: d.travelSpeed } : {}),
        ...(typeof d?.pathThickness === 'number' ? { pathThickness: d.pathThickness } : {}),
        ...(typeof d?.pathColor === 'string' && d.pathColor ? { pathColor: d.pathColor } : {}),
      }
    }),
    flowContext: flowContext ?? null,
  }
}

// ── Streaming fetch ────────────────────────────────────────────────────────────

export async function streamEvalSuggestions(
  nodes: Node<BaseNodeData>[],
  edges: Edge[],
  flowName: string,
  flowContext: FlowContext | null,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (msg: string) => void,
): Promise<void> {
  const payload = serializePayload(nodes, edges, flowName, flowContext)

  const response = await fetch('/api/eval-suggestions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

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
      if (raw === '[DONE]') {
        onDone()
        return
      }
      try {
        const parsed = JSON.parse(raw) as { text?: string; error?: string }
        if (parsed.error) {
          onError(parsed.error)
          return
        }
        if (parsed.text) onChunk(parsed.text)
      } catch {
        // malformed SSE line — skip
      }
    }
  }

  onDone()
}
