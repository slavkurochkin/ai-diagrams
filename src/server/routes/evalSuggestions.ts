import { Router } from 'express'
import OpenAI from 'openai'
import { graphBodyLimits } from '../middleware/graphLimits.js'
import { requireServerAiEnabled } from '../middleware/aiGate.js'

export const evalSuggestionsRouter = Router()
evalSuggestionsRouter.use(requireServerAiEnabled)

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

evalSuggestionsRouter.post('/eval-suggestions', graphBodyLimits, async (req, res) => {
  const { nodes, edges, flowName, flowContext } = req.body as EvalRequest

  if (!nodes || !edges) {
    return res.status(400).json({ error: 'nodes and edges are required' })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY not set on server' })
  }

  const graphText = graphToText(nodes, edges, flowName ?? 'Untitled')
  const ctxText = flowContext ? contextToText(flowContext) : null

  const userMessage = ctxText
    ? `${ctxText}\n\n---\n\n## Flow diagram\n\n${graphText}`
    : `## Flow diagram\n\n${graphText}`

  const systemPrompt = `You are an expert in AI/LLM system evaluation and QA engineering.
The user will provide a description of an AI agent or pipeline, optionally with business documents, and the diagram of its components.
Each node may list **config** (model, thresholds, prompts, etc.) and an optional **note** with strategy or context. Edges may list **priority** and **travelSpeed** when the author set routing or animation hints—use these to infer parallel vs sequential emphasis and risk focus.
Your job is to produce actionable evaluation recommendations.

Structure your response in exactly these three sections:

## Component Evaluation

For each significant node or group of nodes, provide a brief card:
- **[Node type + label]** — what to evaluate, which metric or eval node to use (e.g. LLM Judge, Rubric, Trajectory Eval), and the key risk to watch.

Keep each entry to 2–3 lines. Skip trivial infrastructure nodes (e.g. a lone output parser) unless there's a real risk.

## End-to-End Evaluation Strategy

2–3 paragraphs of prose. Cover: how to evaluate the whole flow as a unit, what data you'd need (golden datasets, logs, human ratings), and how to set pass/fail thresholds. Tailor advice to any business requirements found in the context documents.

## Recommended Test Cases

A numbered list of 5–8 specific, concrete test cases. Each test case should include:
- The input or scenario
- What to check (the assertion)
- Why it matters (one sentence)

Prioritise failure modes, edge cases, adversarial inputs, and anything implied by the business documents. If no documents are provided, focus on generic but realistic failure scenarios for this type of agent.

Be direct and specific. Do not repeat the node list verbatim. Do not use filler phrases.`

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  try {
    const client = new OpenAI({ apiKey })

    const stream = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 2000,
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
