import { Router } from 'express'
import {
  createLLMClient,
  getApiKeyError,
  type Provider,
} from '../lib/llmProvider.js'

export const flowContextSynthesizeRouter = Router()

interface SerializedNode {
  id: string
  nodeType: string
  label: string
  description?: string
  config: Record<string, unknown>
}

interface SerializedEdge {
  id: string
  source: string
  sourceHandle: string | null
  target: string
  targetHandle: string | null
}

interface SynthesizeRequest {
  nodes: SerializedNode[]
  edges: SerializedEdge[]
  flowName?: string
  existingContext?: {
    description?: string
    howItWorks?: string
  } | null
  provider?: Provider
}

function nodeAuthorIntentSummary(nodes: SerializedNode[]): string {
  if (nodes.length === 0) return ''
  const lines = nodes.map((n) => {
    const desc =
      typeof n.description === 'string' && n.description.trim()
        ? n.description.trim()
        : '(no description — infer from label, type, and config)'
    return `- **${n.id}** — [${n.nodeType}] "${n.label}": ${desc}`
  })
  return ['### Author intent (per node)', '', ...lines].join('\n')
}

function graphToPromptText(
  nodes: SerializedNode[],
  edges: SerializedEdge[],
  flowName: string,
): string {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const intent = nodeAuthorIntentSummary(nodes)
  const nodeLines = nodes.map((n) => {
    const descLine =
      typeof n.description === 'string' && n.description.trim()
        ? `    description: ${n.description.trim()}`
        : ''
    const configEntries = Object.entries(n.config)
      .filter(([, v]) => v !== undefined && v !== '' && v !== null)
      .map(([k, v]) => `    ${k}: ${String(v)}`)
      .join('\n')
    const body = [descLine, configEntries].filter(Boolean).join('\n')
    return body
      ? `- [${n.nodeType}] "${n.label}" (id: ${n.id})\n${body}`
      : `- [${n.nodeType}] "${n.label}" (id: ${n.id})`
  })
  const edgeLines = edges.map((e) => {
    const src = nodeMap.get(e.source)
    const tgt = nodeMap.get(e.target)
    const srcLabel = src ? `"${src.label}"` : e.source
    const tgtLabel = tgt ? `"${tgt.label}"` : e.target
    const handles =
      e.sourceHandle && e.targetHandle ? ` [${e.sourceHandle} → ${e.targetHandle}]` : ''
    return `- [edge id: ${e.id}] ${srcLabel} → ${tgtLabel}${handles}`
  })
  return [
    `Flow name: ${flowName}`,
    '',
    intent,
    '',
    `Nodes (${nodes.length}) — detail:`,
    ...nodeLines,
    '',
    `Connections (${edges.length}):`,
    ...edgeLines,
  ].join('\n')
}

function parseSynthesizedJson(raw: string): { description: string; howItWorks: string } {
  let t = raw.trim()
  const fence = t.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/m)
  if (fence) t = fence[1].trim()
  const j = JSON.parse(t) as { description?: unknown; howItWorks?: unknown }
  const description = typeof j.description === 'string' ? j.description.trim() : ''
  const howItWorks = typeof j.howItWorks === 'string' ? j.howItWorks.trim() : ''
  if (!description && !howItWorks) {
    throw new Error('Model returned empty description and howItWorks')
  }
  return { description, howItWorks }
}

flowContextSynthesizeRouter.post('/flow-context-synthesize', async (req, res) => {
  const body = req.body as SynthesizeRequest
  const { nodes, edges, flowName, existingContext = null, provider } = body

  if (!nodes || !Array.isArray(nodes) || !edges || !Array.isArray(edges)) {
    return res.status(400).json({ error: 'nodes and edges arrays are required' })
  }

  if (nodes.length === 0) {
    return res.status(400).json({ error: 'at least one node is required to synthesize context' })
  }

  const keyError = getApiKeyError(provider)
  if (keyError) return res.status(500).json({ error: keyError })

  const graphText = graphToPromptText(nodes, edges, flowName ?? 'Untitled')

  const existingBlock =
    existingContext &&
    (existingContext.description?.trim() || existingContext.howItWorks?.trim())
      ? [
          '## Existing flow context (refine and align with the diagram; do not contradict the diagram)',
          '',
          `**What it does (draft):** ${existingContext.description?.trim() || '(empty)'}`,
          '',
          `**How it works (draft):** ${existingContext.howItWorks?.trim() || '(empty)'}`,
        ].join('\n')
      : '## Existing flow context\n\n(none — generate from the diagram only)'

  const systemPrompt = `You write Flow Context prose for an AI agent builder product.

The user has a node-and-edge diagram. Each node may include a human-written **description** of that step's role in this specific design.

Your job: produce text for two fields used by humans and coding agents:

1. **description** — What the system does end-to-end (goal, audience, outcomes). About 2–5 sentences. Plain sentences only inside the JSON string (no markdown headings).

2. **howItWorks** — Architecture for implementers: main path from entry to output, important branches (routers, tool loops, retrieval), and notable config-driven behavior. Use short paragraphs and/or bullet lines separated by newlines inside the JSON string. Enough detail that a coding agent could implement the pipeline without seeing the diagram.

Rules:
- Ground claims in the diagram: node types, labels, per-node descriptions, edges, and configs.
- If **Existing flow context** is provided, merge and improve it: keep accurate intent, fix anything that disagrees with the diagram, fill gaps.
- Do not invent node types that are not in the diagram.
- Return **only** valid JSON, no other text, with exactly these keys: "description", "howItWorks" (both strings).`

  const userContent = `${existingBlock}\n\n---\n\n## Diagram\n\n${graphText}`

  try {
    const { client, model } = createLLMClient(provider)
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.25,
      max_tokens: 2200,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
    })

    const raw = completion.choices[0]?.message?.content
    if (!raw || typeof raw !== 'string') {
      return res.status(502).json({ error: 'empty model response' })
    }

    const parsed = parseSynthesizedJson(raw)
    return res.json(parsed)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Synthesis failed'
    return res.status(500).json({ error: message })
  }
})
