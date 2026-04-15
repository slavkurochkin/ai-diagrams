import { Router } from 'express'
import { createLLMClient, getApiKeyError, type Provider } from '../lib/llmProvider.js'
import { formatEvalNodeCatalogMarkdown } from '../../lib/nodeCatalogForAI.js'

export const evalSuggestionsRouter = Router()

// ── Types ──────────────────────────────────────────────────────────────────────

interface SerializedNode {
  id: string
  nodeType: string
  label: string
  config: Record<string, unknown>
  note?: string
}

interface SerializedEdge {
  id: string
  source: string
  sourceHandle: string | null
  target: string
  targetHandle: string | null
  executionPriority?: number
  travelSpeed?: number
  pathThickness?: number
  pathColor?: string
}

interface FlowContextDocument {
  id: string
  name: string
  content: string
}

interface FlowContext {
  description: string
  howItWorks: string
  documents: FlowContextDocument[]
}

interface EvalRequest {
  nodes: SerializedNode[]
  edges: SerializedEdge[]
  flowName: string
  flowContext: FlowContext | null
}

// ── Serialise graph to readable text ──────────────────────────────────────────

function graphToText(nodes: SerializedNode[], edges: SerializedEdge[], flowName: string): string {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  const nodeLines = nodes.map((n) => {
    const configLines = Object.entries(n.config)
      .filter(([, v]) => v !== undefined && v !== '' && v !== null)
      .map(([k, v]) => `    ${k}: ${String(v)}`)
    const noteLines = n.note
      ? ['    note (strategy / context):', ...n.note.split('\n').map((line) => `    ${line}`)]
      : []
    const body = [...configLines, ...noteLines].join('\n')
    return body
      ? `- [${n.nodeType.toUpperCase()}] "${n.label}" (id: ${n.id})\n${body}`
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
    const meta: string[] = []
    if (typeof e.executionPriority === 'number') {
      meta.push(`priority=${e.executionPriority}`)
    }
    if (typeof e.travelSpeed === 'number') {
      meta.push(`travelSpeed=${e.travelSpeed}`)
    }
    if (typeof e.pathThickness === 'number') {
      meta.push(`pathThickness=${e.pathThickness}`)
    }
    if (e.pathColor) {
      meta.push(`pathColor=${e.pathColor}`)
    }
    const metaStr = meta.length > 0 ? ` (${meta.join(', ')})` : ''
    return `- ${srcLabel} → ${tgtLabel}${handles}${metaStr}`
  })

  return [
    `Flow name: ${flowName}`,
    ``,
    `Nodes (${nodes.length}):`,
    ...nodeLines,
    ``,
    `Connections (${edges.length}):`,
    ...edgeLines,
  ].join('\n')
}

function contextToText(ctx: FlowContext): string {
  const lines: string[] = [
    '## Agent context',
    '',
    `**What it does:** ${ctx.description || '(not provided)'}`,
    '',
    `**How it works:** ${ctx.howItWorks || '(not provided)'}`,
  ]

  if (ctx.documents.length > 0) {
    lines.push('', '## Business documents')
    for (const doc of ctx.documents) {
      lines.push('', `### ${doc.name || 'Untitled document'}`)
      lines.push(doc.content.trim())
    }
  }

  return lines.join('\n')
}

// ── POST /api/eval-suggestions ────────────────────────────────────────────────

evalSuggestionsRouter.post('/eval-suggestions', async (req, res) => {
  const { nodes, edges, flowName, flowContext, provider } = req.body as EvalRequest & { provider?: Provider }

  if (!nodes || !edges) {
    return res.status(400).json({ error: 'nodes and edges are required' })
  }

  const keyError = getApiKeyError(provider)
  if (keyError) return res.status(500).json({ error: keyError })

  const graphText = graphToText(nodes, edges, flowName ?? 'Untitled')
  const ctxText = flowContext ? contextToText(flowContext) : null

  const userMessage = ctxText
    ? `${ctxText}\n\n---\n\n## Flow diagram\n\n${graphText}`
    : `## Flow diagram\n\n${graphText}`

  const systemPrompt = `You are an expert in AI/LLM system evaluation and QA engineering.
The user will provide a description of an AI agent or pipeline, optionally with business documents, and the diagram of its components.
Each node may list **config** (model, thresholds, prompts, etc.) and an optional **note** with strategy or context.
Your job is to produce actionable evaluation recommendations in two parts: strategy first, then test cases.

Here is the catalog of available eval node types you can recommend adding to the diagram:
${formatEvalNodeCatalogMarkdown()}

Structure your response in exactly these three sections:

## Eval Strategy

Lead with the most important eval nodes to add to this diagram. For each recommendation:
- **[EvalNodeType]** → where in the flow to add it, which metric it measures, and a concrete threshold to target (e.g. faithfulness ≥ 0.85, task completion ≥ 90%, latency p95 < 3s).

Then 1–2 short paragraphs on the overall eval approach: what data you'd need (golden dataset, production logs, human labels), how to gate on quality before promoting to production, and any business requirements from the context documents that should drive specific thresholds.

Limit to the 4–6 most impactful recommendations. Do not suggest eval nodes that are already present.

## Test Cases

A numbered list of 5–7 specific, concrete test scenarios. For each:
- **Scenario** — what you send or simulate
- **Assert** — what the correct outcome looks like
- **Why** — one sentence on what failure would mean

Prioritise: adversarial inputs, edge cases, data contract violations between nodes, and failure modes implied by the business documents. Focus on cases where the pipeline could silently produce wrong output rather than visibly crash.

## Production Observability

Cover what to instrument and watch once this pipeline is live. Structure as three sub-sections:

**Online evals** — which eval checks to run continuously against live traffic (e.g. sample 5% of requests through an llmJudge for hallucination, run ragEvaluator on retrieval quality). Name specific metrics and sampling rates. Flag which ones are cheap enough to run on every request vs which need sampling.

**Key metrics to track** — 4–6 specific signals for this pipeline type. Go beyond generic latency/error rate — name metrics tied to the actual nodes present (e.g. retrieval recall, reranker score distribution, tool call success rate, guardrail trigger rate, token cost per request). Include suggested alert thresholds where possible.

**Observability capabilities to look for** — based on the nodes in this pipeline, describe 3–4 specific platform capabilities the builder should require when evaluating observability tooling (e.g. "LLM trace capture with prompt/response logging", "online eval execution against sampled live traffic", "per-request cost tracking", "human review queue for annotation"). Do not name specific vendors. Frame each capability as a requirement tied to a real need in this pipeline.

Be direct. No filler. Ground everything in the actual pipeline and context.`

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  try {
    const { client, model } = createLLMClient(provider)

    const stream = await client.chat.completions.create({
      model,
      max_tokens: 2800,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
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
