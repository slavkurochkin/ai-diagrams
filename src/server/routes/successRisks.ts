import { Router } from 'express'
import { createLLMClient, getApiKeyError, type Provider } from '../lib/llmProvider.js'

export const successRisksRouter = Router()

// ── Shared types ───────────────────────────────────────────────────────────────

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

interface NeighborNode {
  id: string
  nodeType: string
  label: string
  config: Record<string, unknown>
}

interface NodeNeighborhood {
  target: NeighborNode
  upstream: NeighborNode[]
  downstream: NeighborNode[]
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

interface AnalysisRequest {
  flowName: string
  flowContext: FlowContext | null
  nodes: SerializedNode[]
  edges: SerializedEdge[]
  neighborhood: NodeNeighborhood | null
}

// ── Serialisers ───────────────────────────────────────────────────────────────

function formatNode(n: NeighborNode): string {
  const cfg = Object.entries(n.config)
    .filter(([, v]) => v !== undefined && v !== '' && v !== null)
    .map(([k, v]) => `    ${k}: ${String(v)}`)
    .join('\n')
  return cfg
    ? `[${n.nodeType}] "${n.label}"\n${cfg}`
    : `[${n.nodeType}] "${n.label}"`
}

function graphToText(nodes: SerializedNode[], edges: SerializedEdge[], flowName: string): string {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  const nodeLines = nodes.map((n) => {
    const cfg = Object.entries(n.config)
      .filter(([, v]) => v !== undefined && v !== '' && v !== null)
      .map(([k, v]) => `    ${k}: ${String(v)}`)
      .join('\n')
    return cfg
      ? `- [${n.nodeType}] "${n.label}" (id: ${n.id})\n${cfg}`
      : `- [${n.nodeType}] "${n.label}" (id: ${n.id})`
  })

  const edgeLines = edges.map((e) => {
    const src = nodeMap.get(e.source)
    const tgt = nodeMap.get(e.target)
    return `- "${src?.label ?? e.source}" → "${tgt?.label ?? e.target}"`
  })

  return [
    `Flow name: ${flowName}`,
    '',
    `Nodes (${nodes.length}):`,
    ...nodeLines,
    '',
    `Connections (${edges.length}):`,
    ...edgeLines,
  ].join('\n')
}

function contextToText(ctx: FlowContext): string {
  const lines = [
    `What it does: ${ctx.description || '(not provided)'}`,
    `How it works: ${ctx.howItWorks || '(not provided)'}`,
  ]
  if (ctx.documents.length > 0) {
    lines.push('', 'Business documents:')
    for (const doc of ctx.documents) {
      lines.push(`  [${doc.name || 'Untitled'}]: ${doc.content.trim().slice(0, 400)}`)
    }
  }
  return lines.join('\n')
}

function neighborhoodToText(nh: NodeNeighborhood): string {
  const lines = [
    '## Node being analyzed',
    formatNode(nh.target),
  ]
  if (nh.upstream.length > 0) {
    lines.push('', `## Upstream inputs (${nh.upstream.length} node${nh.upstream.length > 1 ? 's' : ''} feeding into this node)`)
    nh.upstream.forEach((n) => lines.push(formatNode(n)))
  } else {
    lines.push('', '## Upstream inputs: none (this is an entry point)')
  }
  if (nh.downstream.length > 0) {
    lines.push('', `## Downstream outputs (${nh.downstream.length} node${nh.downstream.length > 1 ? 's' : ''} receiving from this node)`)
    nh.downstream.forEach((n) => lines.push(formatNode(n)))
  } else {
    lines.push('', '## Downstream outputs: none (this is an exit point)')
  }
  return lines.join('\n')
}

// ── SSE helper ────────────────────────────────────────────────────────────────

async function streamResponse(
  res: import('express').Response,
  provider: Provider | undefined,
  systemPrompt: string,
  userMessage: string,
  maxTokens = 1800,
) {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  try {
    const { client, model } = createLLMClient(provider)
    const stream = await client.chat.completions.create({
      model,
      max_tokens: maxTokens,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    })
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content
      if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`)
    }
    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.write(`data: ${JSON.stringify({ error: message })}\n\n`)
    res.end()
  }
}

// ── POST /api/success-criteria ────────────────────────────────────────────────

successRisksRouter.post('/success-criteria', async (req, res) => {
  const { flowName, flowContext, nodes, edges, neighborhood, provider } = req.body as AnalysisRequest & { provider?: Provider }

  if (!nodes) return res.status(400).json({ error: 'nodes required' })

  const keyError = getApiKeyError(provider)
  if (keyError) return res.status(500).json({ error: keyError })

  const isNodeScoped = !!neighborhood
  const ctxText = flowContext ? contextToText(flowContext) : null

  let systemPrompt: string
  let userMessage: string

  if (isNodeScoped) {
    systemPrompt = `You are an AI systems expert. Your job is to define concrete, measurable success criteria for a single node inside an AI pipeline.

You will be given:
1. The node being analyzed (its type, label, and config)
2. Its upstream inputs — what feeds data into it
3. Its downstream outputs — what receives its results
4. The full pipeline context for background

Structure your response in exactly these three sections:

## Primary success condition
One focused sentence: what does this node need to produce for the overall pipeline to work correctly?

## Measurable signals
3–5 specific, observable indicators that this node is working well. Be concrete — name metrics, thresholds, or behaviors. Examples: latency under Xms, retrieval precision above Y%, zero hallucinated tool calls, etc.

## Failure boundary
Exactly 2–3 conditions that would indicate this node has failed and how the downstream pipeline would break as a result.

Be specific to this node's type and its position in the flow. Do not give generic advice.`

    const graphText = graphToText(nodes, edges, flowName ?? 'Untitled')
    const nhText = neighborhoodToText(neighborhood)
    userMessage = [
      ctxText ? `## Agent context\n${ctxText}\n\n---` : '',
      `## Full pipeline\n${graphText}`,
      '',
      '---',
      '',
      nhText,
    ].filter(Boolean).join('\n')
  } else {
    systemPrompt = `You are an AI systems expert. Your job is to define concrete, measurable success criteria for an end-to-end AI pipeline.

Structure your response in exactly these three sections:

## What success looks like
2–3 sentences on the intended outcome — what the pipeline should reliably produce, for whom, and under what conditions.

## Measurable signals
4–6 specific, observable indicators that the pipeline is working well end-to-end. Be concrete — name metrics, thresholds, or behaviors relevant to the actual node types present. Examples: query latency < 2s, retrieval recall > 80%, guardrail block rate < 0.5%, eval score > 4/5.

## Definition of done
3–5 acceptance criteria a QA engineer could verify before calling this pipeline production-ready. Make them testable, not aspirational.

Be direct. No filler. Ground everything in the actual pipeline nodes and their configurations.`

    const graphText = graphToText(nodes, edges, flowName ?? 'Untitled')
    userMessage = [
      ctxText ? `## Agent context\n${ctxText}\n\n---` : '',
      `## Pipeline\n${graphText}`,
    ].filter(Boolean).join('\n')
  }

  await streamResponse(res, provider, systemPrompt, userMessage)
})

// ── POST /api/risk-analysis ───────────────────────────────────────────────────

successRisksRouter.post('/risk-analysis', async (req, res) => {
  const { flowName, flowContext, nodes, edges, neighborhood, provider } = req.body as AnalysisRequest & { provider?: Provider }

  if (!nodes) return res.status(400).json({ error: 'nodes required' })

  const keyError = getApiKeyError(provider)
  if (keyError) return res.status(500).json({ error: keyError })

  const isNodeScoped = !!neighborhood
  const ctxText = flowContext ? contextToText(flowContext) : null

  let systemPrompt: string
  let userMessage: string

  if (isNodeScoped) {
    systemPrompt = `You are a senior AI reliability engineer performing a risk assessment for a single node inside an AI pipeline.

You will be given:
1. The node being analyzed (its type, label, and config)
2. Its upstream inputs — what feeds data into it
3. Its downstream outputs — what receives its results
4. The full pipeline context for background

Structure your response in exactly these three sections:

## Top risks
3–5 specific failure modes for this node given its type and position. For each risk:
- **[Risk name]** (🔴 High / 🟡 Medium / 🟢 Low) — what breaks, why, and the downstream consequence.

Focus on: misconfiguration risks, data contract violations with upstream/downstream, latency/cost risks, and correctness risks unique to this node type.

## Mitigation actions
Concrete, actionable steps to reduce the top risks. Be specific — reference the node's config values where relevant.

## Monitoring signals
2–3 specific metrics or alerts that would catch this node's failure in production.

Be specific to this node's type and its neighbors. Do not give generic advice.`

    const graphText = graphToText(nodes, edges, flowName ?? 'Untitled')
    const nhText = neighborhoodToText(neighborhood)
    userMessage = [
      ctxText ? `## Agent context\n${ctxText}\n\n---` : '',
      `## Full pipeline\n${graphText}`,
      '',
      '---',
      '',
      nhText,
    ].filter(Boolean).join('\n')
  } else {
    systemPrompt = `You are a senior AI reliability engineer performing a risk assessment for an end-to-end AI pipeline.

Structure your response in exactly these three sections:

## Top risks
4–6 specific risks in this pipeline, ordered by severity. For each:
- **[Risk name]** (🔴 High / 🟡 Medium / 🟢 Low) — what breaks, why, and the user-visible consequence.

Focus on architectural risks: single points of failure, missing guardrails, latency cliffs, cost overruns, eval blind spots, and data quality issues.

## Mitigation actions
Priority-ordered list of concrete actions to reduce the top risks. Reference specific node types from the catalog where relevant.

## What to monitor in production
3–5 specific metrics or alerts that would surface failures in this pipeline early. Be concrete.

Be direct. Ground everything in the actual nodes and connections present in the diagram.`

    const graphText = graphToText(nodes, edges, flowName ?? 'Untitled')
    userMessage = [
      ctxText ? `## Agent context\n${ctxText}\n\n---` : '',
      `## Pipeline\n${graphText}`,
    ].filter(Boolean).join('\n')
  }

  await streamResponse(res, provider, systemPrompt, userMessage)
})
