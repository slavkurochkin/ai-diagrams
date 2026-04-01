import { Router } from 'express'
import OpenAI from 'openai'

export const explainRouter = Router()

// ── Types (mirrored from frontend, no import needed server-side) ───────────────

interface SerializedNode {
  id: string
  nodeType: string
  label: string
  config: Record<string, unknown>
}

interface SerializedEdge {
  id: string
  source: string
  sourceHandle: string | null
  target: string
  targetHandle: string | null
}

interface ExplainRequest {
  nodes: SerializedNode[]
  edges: SerializedEdge[]
  flowName: string
}

// ── Graph → plain text ─────────────────────────────────────────────────────────

function graphToText(nodes: SerializedNode[], edges: SerializedEdge[], flowName: string): string {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  const nodeLines = nodes.map((n) => {
    const configEntries = Object.entries(n.config)
      .filter(([, v]) => v !== undefined && v !== '' && v !== null)
      .map(([k, v]) => `    ${k}: ${String(v)}`)
      .join('\n')

    return configEntries
      ? `- [${n.nodeType.toUpperCase()}] "${n.label}" (id: ${n.id})\n${configEntries}`
      : `- [${n.nodeType.toUpperCase()}] "${n.label}" (id: ${n.id})`
  })

  const edgeLines = edges.map((e) => {
    const src = nodeMap.get(e.source)
    const tgt = nodeMap.get(e.target)
    const srcLabel = src ? `"${src.label}"` : e.source
    const tgtLabel = tgt ? `"${tgt.label}"` : e.target
    const handles = e.sourceHandle && e.targetHandle
      ? ` [${e.sourceHandle} → ${e.targetHandle}]`
      : ''
    return `- ${srcLabel} → ${tgtLabel}${handles}`
  })

  return [
    `Diagram name: ${flowName}`,
    ``,
    `Nodes (${nodes.length}):`,
    ...nodeLines,
    ``,
    `Connections (${edges.length}):`,
    ...edgeLines,
  ].join('\n')
}

// ── POST /api/explain ──────────────────────────────────────────────────────────

explainRouter.post('/explain', async (req, res) => {
  const { nodes, edges, flowName } = req.body as ExplainRequest

  if (!nodes || !edges) {
    return res.status(400).json({ error: 'nodes and edges are required' })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY not set on server' })
  }

  const graphText = graphToText(nodes, edges, flowName ?? 'Untitled')

  const systemPrompt = `You are an expert in AI/LLM system architecture and QA.
The user will give you a description of an AI pipeline diagram.
Structure your response in exactly these four sections:

**What it does**
One short paragraph — what the system accomplishes end-to-end.

**Data flow**
How data moves through the key components, step by step. Keep it concise.

**Design observations**
Notable design choices, potential bottlenecks, or best-practice gaps. Flag missing components (e.g. no guardrail, no caching, no eval step) with specific consequences.

**Test cases to consider**
3–5 concrete, specific test scenarios the builder should verify. Focus on failure modes, edge cases, and adversarial inputs — not happy path. Examples of good test cases:
- "What happens if the retriever returns 0 results?"
- "Send a prompt injection in the user query — does the guardrail catch it?"
- "Feed a 50-page PDF — does chunking stay within the embedding model's context limit?"

Be direct. Use plain language. Avoid filler phrases. Do not repeat the node list back verbatim.`

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  try {
    const client = new OpenAI({ apiKey })

    const stream = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1500,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Here is the pipeline diagram:\n\n${graphText}` },
      ],
    })

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`)
      }
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.write(`data: ${JSON.stringify({ error: message })}\n\n`)
    res.end()
  }
})
