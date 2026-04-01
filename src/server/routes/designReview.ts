import { Router } from 'express'
import OpenAI from 'openai'

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

// ── Full node catalog ─────────────────────────────────────────────────────────
// Keep this in sync with src/lib/nodeDefinitions.ts

const NODE_CATALOG = `
CORE
  llm             — LLM call (GPT-4o, Claude, Gemini, etc.)
  prompt          — Static prompt message (system / user / assistant role)
  promptTemplate  — Dynamic prompt with variable injection (Jinja-style)
  memory          — Stores and retrieves conversation history or entity state
  agent           — Autonomous agent that reasons, plans, and calls tools iteratively
  outputParser    — Parses / validates / transforms raw LLM output

DATA & RETRIEVAL
  dataLoader      — Ingests data from files, URLs, or databases
  chunker         — Splits documents into token-bounded chunks
  embedding       — Generates vector embeddings from text
  vectorDB        — Stores and indexes vectors for similarity search
  retriever       — Queries a vector store; returns top-K relevant chunks
  reranker        — Reranks retrieved results using a cross-encoder model
  cache           — Caches responses to reduce latency and cost

ROUTING & CONTROL
  router          — Routes data to one of several branches based on a condition
  classifier      — Classifies input into categories
  aggregator      — Merges outputs from multiple branches

TOOLS & EXTERNAL
  toolCall        — Calls an external tool or API
  webSearch       — Searches the web and returns results

SAFETY
  guardrails      — Filters / validates input and output; blocks policy violations

EVALUATION
  evaluator       — General-purpose evaluator node
  llmJudge        — Uses an LLM to score another LLM's output
  rubric          — Criterion-based scoring against a rubric
  comparator      — A/B comparison of two outputs
  groundTruth     — Compares output against a known correct answer
  evalMetrics     — Computes quantitative metrics (BLEU, ROUGE, etc.)
  critique        — Generates a written critique of an output
  thresholdGate   — Pass/fail gate based on a score threshold
  humanRater      — Human-in-the-loop rating step
  ragEvaluator    — End-to-end RAG pipeline evaluation (faithfulness, relevance, etc.)
  singleTurnEval  — Evaluates a single prompt-response pair
  multiTurnEval   — Evaluates a multi-turn conversation
  toolUseEval     — Evaluates correct tool selection and call accuracy
  trajectoryEval  — Evaluates agent decision trajectory
  taskCompletion  — Measures whether the agent completed its assigned task
  agentEfficiency — Measures token cost and step count relative to task success
`.trim()

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
  const { nodes, edges, flowName, flowContext } = req.body as ReviewRequest

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

  const systemPrompt = `You are a senior AI systems architect performing a design review.
You will receive a flow diagram of an AI/LLM pipeline, and optionally an agent context description with business documents.

Here is the full catalog of available node types the user can add to their diagram:

${NODE_CATALOG}

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
