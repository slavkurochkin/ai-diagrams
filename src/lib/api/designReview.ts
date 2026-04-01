import type { Node, Edge } from 'reactflow'
import type { BaseNodeData } from '../../types/nodes'
import type { FlowContext } from '../../types/flow'

export async function streamDesignReview(
  nodes: Node<BaseNodeData>[],
  edges: Edge[],
  flowName: string,
  flowContext: FlowContext | null,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (msg: string) => void,
): Promise<void> {
  const payload = {
    flowName,
    nodes: nodes.map((n) => ({
      id: n.id,
      nodeType: n.data.nodeType,
      label: n.data.label,
      config: n.data.config ?? {},
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      sourceHandle: e.sourceHandle ?? null,
      target: e.target,
      targetHandle: e.targetHandle ?? null,
    })),
    flowContext: flowContext ?? null,
  }

  const response = await fetch('/api/design-review', {
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
