import { Router } from 'express'
import { createLLMClient, getApiKeyError, type Provider } from '../lib/llmProvider.js'
import { formatFullNodeCatalogMarkdown } from '../../lib/nodeCatalogForAI.js'

export const designReviewRouter = Router()

// ── Types ──────────────────────────────────────────────────────────────────────

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

interface ReviewRequest {
  nodes: SerializedNode[]
  edges: SerializedEdge[]
  flowName: string
  flowContext: FlowContext | null
}

// ── Serialisers ───────────────────────────────────────────────────────────────

function graphToText(nodes: SerializedNode[], edges: SerializedEdge[], flowName: string): string {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  const nodeLines = nodes.map((n) => {
    const configEntries = Object.entries(n.config)
      .filter(([, v]) => v !== undefined && v !== '' && v !== null)
      .map(([k, v]) => `    ${k}: ${String(v)}`)
      .join('\n')
    return configEntries
      ? `- [${n.nodeType}] "${n.label}" (id: ${n.id})\n${configEntries}`
      : `- [${n.nodeType}] "${n.label}" (id: ${n.id})`
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
  const lines = [
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

// ── POST /api/design-review ───────────────────────────────────────────────────

designReviewRouter.post('/design-review', async (req, res) => {
  const { nodes, edges, flowName, flowContext, provider } = req.body as ReviewRequest & { provider?: Provider }

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

  const systemPrompt = `You are a senior AI systems architect performing a design review.
You will receive a flow diagram of an AI/LLM pipeline, and optionally an agent context description with business documents.

Here is the full catalog of available node types the user can add to their diagram:

${formatFullNodeCatalogMarkdown()}

## Correct wiring conventions (do not flag these as issues)

The following patterns are intentional and correct — do not suggest changing them:

- **Tool loop:** An \`agent\` node dispatching to a tool (webSearch, toolCall) and receiving results back via the agent's \`tools\` input is correct. This is the intended agentic loop: \`agent.toolRequests → tool → agent.tools\`.
- **Linear tool pipeline:** In deterministic pipelines (no agentic loop), tool nodes (toolCall, webSearch) may flow linearly to the next step rather than looping back to an agent. Both patterns are valid depending on whether the agent decides dynamically or the steps are fixed.
- **Guardrails placement:** A guardrails node between promptTemplate and llm (promptTemplate → guardrails → llm) is correct. The \`blocked\` port being unconnected is intentional — it is a terminal sink.
- **Entry points:** \`prompt(role:user)\` for user-driven flows, \`prompt(role:system)\` for automation/event-driven flows, \`dataLoader\` for batch/data-driven flows — all are correct entry node choices.
- **Memory types:** \`memoryType: conversation\` for short-term and \`memoryType: summary\` for long-term memory are correct. Two separate memory nodes with different types is the right pattern.
- **Agent node for orchestrators:** Using an \`agent\` node (not \`router\`) for orchestrators is correct. \`router\` is only for conditional branching between fixed downstream paths.

## Rules for suggesting missing components

Before suggesting a node type as missing, apply these filters:

- **Do not suggest \`retriever\`, \`vectorDB\`, \`embedding\`, \`chunker\`, or \`reranker\`** unless the flow context or diagram explicitly describes a need to search through a separate knowledge corpus (e.g. "search our docs", "find similar cases", "RAG over internal KB"). If the agent receives its inputs directly from a \`dataLoader\`, user message, or tool call — retrieval is not needed and must not be suggested.
- **Do not suggest \`memory\`** unless the flow involves ongoing conversation, session state across turns, or explicit mention of remembering past interactions. Batch pipelines and single-pass automations do not need memory.
- **Do not suggest \`toolCall\` or \`webSearch\`** unless the agent explicitly needs to call an external API or search the live web as part of its task. Agents that score, evaluate, classify, or generate text from inputs already in the graph do not need tool nodes.
- **Only suggest nodes that are genuinely absent and materially improve the design** for the stated purpose. If the design is complete for its goal, say so — do not pad with speculative additions.

Your job is to identify design gaps, risks, and improvements. Structure your response in exactly these four sections:

## Design Health

One short paragraph — overall verdict on the design quality. What is solid, what is the biggest concern, and a one-line summary of the priority action. Be direct and honest.

${ctxText ? `Also check for mismatches between the agent context description and the actual diagram:
if the description mentions capabilities or patterns (e.g. "multi-agent", "RAG", "guardrails", "caching") that are not present in the nodes, call that out explicitly here.` : ''}

## Missing Components

A bulleted list of node types from the catalog that should be present but are absent, given what this agent is trying to do.
Format each item as:
- **[NodeType]** (🔴 High / 🟡 Medium / 🟢 Low) — one sentence on why it's needed and what risk the absence creates.

Only list genuinely missing components — do not pad with low-value suggestions. If the design is complete for its stated purpose, say so.

## Design Issues

Specific problems found in the current nodes, connections, or config — not about missing nodes, but about what is present and wrong or risky.
Format each as:
- **[Issue title]** — explanation and consequence.

If there are no issues, write "No significant issues found."

## Recommended Improvements

A numbered, priority-ordered list of concrete actions. Reference specific node type names from the catalog.
Each item: what to add or change, where in the flow, and why.
Maximum 6 items. Start with the highest-impact change.

Be direct. No filler. Do not repeat the node list verbatim. Do not suggest things that are already present.`

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  try {
    const { client, model } = createLLMClient(provider)

    const stream = await client.chat.completions.create({
      model,
      max_tokens: 3000,
      temperature: 0.2,
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
})
