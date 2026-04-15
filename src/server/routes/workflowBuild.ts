import { Router } from 'express'
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions'
import {
  createLLMClient,
  getApiKeyError,
  type Provider,
} from '../lib/llmProvider.js'
import {
  formatFullNodeCatalogMarkdown,
  getNodeCatalogForAI,
} from '../../lib/nodeCatalogForAI.js'
import type { SerializedEdge, SerializedNode, WorkflowPatch } from '../../lib/workflowPatch.js'
import {
  graphAfterValidPatches,
  validatePatchChain,
  validateWorkflowPatches,
} from '../../lib/workflowPatch.js'
import type { FlowContext } from '../../types/flow.js'

export const workflowBuildRouter = Router()

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface WorkflowBuildRequest {
  messages: ChatMessage[]
  nodes?: SerializedNode[]
  edges?: SerializedEdge[]
  flowName?: string
  flowContext?: FlowContext | null
  provider?: Provider
}

function contextToText(ctx: FlowContext): string {
  const lines = [
    '## Agent use-case context (authoritative requirements)',
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

function graphSummaryForPrompt(
  nodes: SerializedNode[],
  edges: SerializedEdge[],
  flowName: string,
): string {
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
    const handles =
      e.sourceHandle && e.targetHandle ? ` [${e.sourceHandle} → ${e.targetHandle}]` : ''
    return `- [edge id: ${e.id}] ${srcLabel} → ${tgtLabel}${handles}`
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

const WORKFLOW_PATCH_TOOL: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'apply_workflow_changes',
    description:
      'Propose edits to the flow (new build or follow-up refinements). Use exact node `type` from the catalog. For existing canvas: patch by current node ids and edge ids from the system prompt graph. addEdge: source/target = node ids (or labels); handles optional. removeEdge: use edge id from the prompt.',
    parameters: {
      type: 'object',
      properties: {
        patches: {
          type: 'array',
          description: 'Ordered graph operations.',
          items: {
            type: 'object',
            properties: {
              op: {
                type: 'string',
                enum: [
                  'addNode',
                  'removeNode',
                  'addEdge',
                  'removeEdge',
                  'setNodeConfig',
                  'setNodeLabel',
                ],
              },
              note: {
                type: 'string',
                description: 'For addNode only: 1–2 sentence explanation of why this node is needed in this specific diagram.',
              },
            },
            required: ['op'],
            additionalProperties: true,
          },
        },
      },
      required: ['patches'],
    },
  },
}

function buildSystemPrompt(
  flowName: string,
  nodes: SerializedNode[],
  edges: SerializedEdge[],
  flowContext?: FlowContext | null,
): string {
  const catalog = formatFullNodeCatalogMarkdown()
  const graphBlock =
    nodes.length > 0 || edges.length > 0
      ? `\n## Current flow (may be empty)\n\n${graphSummaryForPrompt(nodes, edges, flowName || 'Untitled')}\n`
      : '\n## Current flow\n\n(No nodes yet — design from the user description.)\n'
  const ctxBlock = flowContext ? `\n${contextToText(flowContext)}\n` : ''

  return `You help users design AI / LLM agent workflows as node graphs.

## Node catalog

${catalog}
${graphBlock}
${ctxBlock}
## Follow-up turns and refinement

The **Current flow** section above is always the live canvas **right now** (after any prior edits in this chat). Users often send another message to **change** what was built: fix wiring, add missing pieces (guardrails, cache, eval), remove nodes, tweak configs, or reconnect.

When they ask to improve, fix, adjust, add, remove, or reconnect — use the tool with **targeted patches** using existing node \`id\`s and edge \`id\`s from that section. Prefer \`setNodeConfig\`, \`addEdge\`, \`removeEdge\`, \`removeNode\`, and new \`addNode\` only where needed; do not rebuild the whole graph unless they ask to start over.

## Patch operations

You may call the tool \`apply_workflow_changes\` with an ordered \`patches\` array:

- **addNode** — { op, id, nodeType, label?, config?, position?, note? } (omit \`position\` for spaced auto-layout on the canvas; always set \`note\` to a 1–2 sentence explanation of why this node is needed in this specific diagram)
- **removeNode** — { op, id }
- **addEdge** — { op, id, source, target, sourceHandle?, targetHandle? } (use node ids; omit handles to auto-connect, or set catalog port ids)
- **removeEdge** — { op, id } (must match \`edge id\` shown on each connection line in Current flow)
- **setNodeConfig** — { op, nodeId, config, merge? } (merge defaults true; if false, resets to defaults then applies config)
- **setNodeLabel** — { op, nodeId, label }

Rules:
- Use only node \`type\` values that appear in the catalog.
- **addEdge** \`source\` / \`target\`: prefer the exact \`id:\` strings from **Current flow**. You may also use a node's \`label\` or \`nodeType\` when it uniquely identifies one node on the canvas — never invent names that are not in **Current flow** unless you \`addNode\` them in the same patch batch. Patches are applied with all \`addNode\` steps before \`addEdge\`, so new nodes exist before edges run.
- **Ports:** use catalog port \`id\` strings (e.g. **guardrails** outputs are \`passed\` and \`blocked\`, not \`output\`; **outputParser** output is \`structured\`). If unsure, **omit** \`sourceHandle\` and \`targetHandle\` on \`addEdge\` so the server picks sensible defaults.
- **Connectivity — no dangling outputs:** Every intermediate node must have its primary output(s) wired to a downstream node. Specifically: (a) a **guardrails** node used as an input guard must connect its \`passed\` output to the next step (e.g. LLM input); as an output guard, to Response Composer or Output Formatter. The \`blocked\` port is a terminal sink and may be left unconnected. (b) A **router** node (Tool Router, intent router, etc.) must connect at least its primary route outputs (\`routeA\`, \`routeB\`, or \`default\`) to downstream nodes — never leave all router outputs floating. (c) For any other flow node, ensure its output connects to a downstream node. After laying out all \`addNode\` patches, review the planned edges and confirm every non-terminal node has at least one outgoing connection.
- **Always include an entry point node.** Every diagram must have exactly one entry node with no incoming edges. Choose based on what initiates the workflow:
  - *User-driven* (chat, assistant, Q&A): use \`prompt\` with \`role: user\`, labeled "User Input" or similar.
  - *Automation / event-driven* (CI monitor, scheduled job, webhook, alert): use \`prompt\` with \`role: system\`, labeled after the trigger (e.g. "CI Failure Event", "Webhook Trigger", "Scheduled Run"). No user is involved.
  - *Data-driven* (batch processing, ingestion pipeline): use \`dataLoader\` as the entry point.
  Never omit the entry node — a diagram with no clear starting point is incomplete.
- **Never use \`router\` as a tool dispatcher.** Nodes labeled "Tool Decision", "Tool Router", "Tool Selector", or similar that decide whether to call a tool are a common mistake — do not create them. Tool dispatch is built into the \`agent\` node: the agent decides internally which tools to call and emits \`toolRequests\`. If you feel the urge to add a router between the agent and a tool, remove it — wire the tool directly to the agent instead. Use \`router\` only when the destination is a different downstream *agent* or *branch*, not a tool.
- **Orchestrators must use the \`agent\` node type**, not \`router\`.
- **Two distinct patterns for nodes that feed the LLM — do not mix them:**
  - *Context providers* (node types: \`memory\`, \`retriever\`, \`reranker\`): connect their output into a \`promptTemplate\` input or directly into the \`llm\` input. They are NOT tool loop nodes.
  - *Tool nodes* (node types: \`webSearch\`, \`toolCall\`): must loop back to the \`agent\` node. The pattern is: \`agent\` \`toolRequests\` output → tool node input → tool node output → \`agent\` \`tools\` input. Never leave a tool node output unconnected.
- **Prompt Builder has one outgoing path to the LLM:** If a guardrails node sits between Prompt Builder and LLM, connect Prompt Builder → guardrails \`input\`, guardrails \`passed\` → LLM. Do not also add a direct Prompt Builder → LLM edge — that creates two parallel paths to the model.
- **Memory node config:** the \`memoryType\` field accepts only \`conversation\`, \`summary\`, or \`entity\`. Never use "short-term" or "long-term" — those are not valid values. To model short-term vs long-term memory, use two separate \`memory\` nodes with \`memoryType: conversation\` and \`memoryType: summary\` respectively, with distinct labels.
- **Terminal output node:** there is no "Output to User" node type. For the final user-facing output use a \`prompt\` node (role: assistant) or an \`outputParser\` node. Do not invent node types that are not in the catalog.
- Prefer small, incremental patches. Explain your reasoning in normal assistant text, then call the tool when the user wants concrete graph changes.
- If Agent use-case context is present, treat it as authoritative constraints; keep proposals aligned with it.

## Wiring principles (apply to any architecture)

These are not templates — they are wiring rules that hold regardless of domain. Use your own knowledge to pick the right nodes for the user's use case; use these principles to wire them correctly.

**Principle 1 — Tool nodes: loop vs. linear (choose one)**

Two valid patterns — pick based on whether the agent decides dynamically which tools to call:

*Pattern A — Dynamic tool loop* (conversational agent, reasoning loop): the agent decides at runtime which tools to invoke. Tools must loop back.
\`\`\`
agent.toolRequests → webSearch.query
webSearch.results  → agent.tools      ← closes the loop
\`\`\`

*Pattern B — Deterministic pipeline* (automation, fixed workflow): tools always run in the same order. Tools flow linearly — no loop needed.
\`\`\`
trigger → toolCall("Fetch Data") → promptTemplate → llm → toolCall("Post Result")
\`\`\`

❌ Never add a router between agent and tool in either pattern:
\`\`\`
agent → router("Tool Decision") → webSearch   ← always wrong
\`\`\`

In Pattern A, both dispatch and return edges are required. In Pattern B, tool outputs connect to the next pipeline step, not back to the agent.

**Principle 2 — Context injection (memory / retrieval → prompt)**
Context providers enrich the prompt; they do not loop back to the agent.
\`\`\`
memory.history     → promptTemplate.variables
retriever.documents → promptTemplate.variables
reranker.ranked    → promptTemplate.variables
\`\`\`
All context flows into the prompt builder, which then feeds the LLM.

**Principle 3 — Single path through guardrails**
Guardrails sit on exactly one path. Never add a parallel direct edge that bypasses them.
\`\`\`
promptTemplate.prompt → guardrails.input
guardrails.passed     → llm.prompt
guardrails.blocked    → (terminal, leave unconnected)
\`\`\`

**Principle 4 — Multi-agent handoff**
Agents hand off via a router; results from parallel agents merge via an aggregator.
\`\`\`
agent("Planner").actions → router.input
router.routeA → agent("Worker A").prompt
router.routeB → agent("Worker B").prompt
agent("Worker A").response → aggregator.inputA
agent("Worker B").response → aggregator.inputB
aggregator.merged → nextStep
\`\`\`

**Principle 5 — Linear chain (no agent)**
For pipelines with no agentic loop, flow is strictly left-to-right with no cycles.
\`\`\`
input → promptTemplate → llm → outputParser → finalOutput
\`\`\`
Retrieval and memory still inject into promptTemplate, not directly into llm.

If the user is only clarifying requirements or asking questions, reply without the tool.`
}

const PATCH_REPAIR_SYSTEM_SUFFIX = `

## Patch repair round

Your previous \`apply_workflow_changes\` tool call in this turn had **validation errors** (see the tool result message). The **Current flow** section below is the live graph **after** only the patches that passed validation — failed operations were not applied.

Call \`apply_workflow_changes\` again with patches that complete the user's request against this graph: fix node ids and catalog port ids, add missing \`addNode\` steps, or correct \`addEdge\` source/target. Prefer small follow-up patches.`

function buildRepairSystemPrompt(
  flowName: string,
  nodes: SerializedNode[],
  edges: SerializedEdge[],
  flowContext?: FlowContext | null,
): string {
  return buildSystemPrompt(flowName, nodes, edges, flowContext) + PATCH_REPAIR_SYSTEM_SUFFIX
}

function maxPatchRepairRounds(): number {
  const raw = process.env.WORKFLOW_PATCH_REPAIR_ROUNDS
  const n = raw === undefined || raw === '' ? 1 : Number(raw)
  if (!Number.isFinite(n)) return 1
  return Math.max(0, Math.min(3, Math.floor(n)))
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRateLimitError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const maybe = err as { status?: unknown; message?: unknown; code?: unknown }
  if (maybe.status === 429) return true
  if (typeof maybe.code === 'string' && maybe.code.toLowerCase().includes('rate')) {
    return true
  }
  if (
    typeof maybe.message === 'string' &&
    /\b429\b|rate limit|too many requests/i.test(maybe.message)
  ) {
    return true
  }
  return false
}

function maxCompletionRetries(provider?: Provider): number {
  const fromEnv = Number(process.env.WORKFLOW_COMPLETION_RETRIES ?? '')
  if (Number.isFinite(fromEnv) && fromEnv >= 0) {
    return Math.min(3, Math.floor(fromEnv))
  }
  return provider === 'gemini' ? 2 : 1
}

function rateLimitErrorMessage(provider?: Provider): string {
  const p = provider ?? 'openai'
  return `${p} is temporarily rate-limited (HTTP 429). Please retry in a few seconds, reduce parallel lanes, or switch provider/model.`
}

workflowBuildRouter.get('/node-catalog', (_req, res) => {
  res.json(getNodeCatalogForAI())
})

workflowBuildRouter.post('/workflow-build', async (req, res) => {
  const body = req.body as WorkflowBuildRequest
  const {
    messages,
    nodes = [],
    edges = [],
    flowName,
    flowContext = null,
    provider,
  } = body

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' })
  }

  for (const m of messages) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant' && m.role !== 'system')) {
      return res.status(400).json({ error: 'each message needs role user|assistant|system' })
    }
    if (typeof m.content !== 'string') {
      return res.status(400).json({ error: 'each message needs string content' })
    }
  }

  const keyError = getApiKeyError(provider)
  if (keyError) {
    return res.status(500).json({ error: keyError })
  }

  const systemPrompt = buildSystemPrompt(flowName ?? 'Untitled', nodes, edges, flowContext)
  const openaiMessages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ]

  try {
    const { client, model } = createLLMClient(provider)
    const maxRepair = maxPatchRepairRounds()

    let conversation: ChatCompletionMessageParam[] = openaiMessages
    let workingNodes: SerializedNode[] = nodes
    let workingEdges: SerializedEdge[] = edges
    let lastContent: string | null = null
    let lastFinishReason: string | null = null
    const patchAccumulator: WorkflowPatch[] = []
    const validationErrors: string[] = []
    const completionRetries = maxCompletionRetries(provider)

    for (let attempt = 0; attempt <= maxRepair; attempt++) {
      let completion
      let completionErr: unknown = null
      for (let completionTry = 0; completionTry <= completionRetries; completionTry++) {
        try {
          completion = await client.chat.completions.create({
            model,
            messages: conversation,
            tools: [WORKFLOW_PATCH_TOOL],
            tool_choice: 'auto',
            temperature: 0.2,
          })
          completionErr = null
          break
        } catch (err) {
          completionErr = err
          if (!isRateLimitError(err) || completionTry >= completionRetries) {
            break
          }
          const backoffMs = 1200 * (completionTry + 1)
          await sleep(backoffMs)
        }
      }
      if (!completion) {
        if (isRateLimitError(completionErr)) {
          return res.status(429).json({ error: rateLimitErrorMessage(provider) })
        }
        throw completionErr
      }

      const choice = completion.choices[0]
      const msg = choice?.message
      if (!msg) {
        return res.status(502).json({ error: 'empty completion' })
      }

      lastContent = msg.content ?? lastContent
      lastFinishReason = choice.finish_reason ?? lastFinishReason

      const collectedRaw: unknown[] = []
      const attemptValid: WorkflowPatch[] = []
      const attemptErrors: string[] = []

      if (msg.tool_calls?.length) {
        for (const tc of msg.tool_calls) {
          if (tc.type !== 'function') continue
          if (tc.function.name !== 'apply_workflow_changes') continue
          try {
            const args = JSON.parse(tc.function.arguments || '{}') as { patches?: unknown }
            if (Array.isArray(args.patches)) {
              for (const p of args.patches) collectedRaw.push(p)
            }
          } catch {
            const jsonErr =
              attempt === 0
                ? `tool call ${tc.id}: invalid JSON in arguments`
                : `repair ${attempt}: tool ${tc.id}: invalid JSON in arguments`
            validationErrors.push(jsonErr)
            attemptErrors.push(jsonErr)
          }
        }
      }

      if (collectedRaw.length > 0) {
        const { validPatches, errors } = validateWorkflowPatches(
          collectedRaw,
          workingNodes,
          workingEdges,
        )
        attemptValid.push(...validPatches)
        for (const e of errors) {
          attemptErrors.push(attempt === 0 ? e : `repair ${attempt}: ${e}`)
        }
      }

      patchAccumulator.push(...attemptValid)
      validationErrors.push(...attemptErrors)

      const afterAttempt = graphAfterValidPatches(workingNodes, workingEdges, collectedRaw)
      workingNodes = afterAttempt.nodes
      workingEdges = afterAttempt.edges

      const hadWorkflowTool = msg.tool_calls?.some(
        (tc) => tc.type === 'function' && tc.function.name === 'apply_workflow_changes',
      )
      const needsRepair =
        attempt < maxRepair && hadWorkflowTool && attemptErrors.length > 0

      if (!needsRepair) break

      const assistantMsg: ChatCompletionMessageParam = {
        role: 'assistant',
        content: msg.content,
        tool_calls: msg.tool_calls,
      }
      const toolMsgs: ChatCompletionMessageParam[] = (msg.tool_calls ?? []).map((tc) => {
        if (tc.type !== 'function') {
          return { role: 'tool' as const, tool_call_id: tc.id, content: '{}' }
        }
        if (tc.function.name !== 'apply_workflow_changes') {
          return {
            role: 'tool' as const,
            tool_call_id: tc.id,
            content: JSON.stringify({ error: 'unsupported tool in repair turn' }),
          }
        }
        return {
          role: 'tool' as const,
          tool_call_id: tc.id,
          content: JSON.stringify({
            validationErrors: attemptErrors,
            patchesAccepted: attemptValid.length,
            hint: 'Update your next apply_workflow_changes to fix these errors against the graph in the new system prompt.',
          }),
        }
      })

      conversation = [
        {
          role: 'system',
          content: buildRepairSystemPrompt(
            flowName ?? 'Untitled',
            workingNodes,
            workingEdges,
            flowContext,
          ),
        },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        assistantMsg,
        ...toolMsgs,
      ]
    }

    const chain = validatePatchChain(patchAccumulator, nodes, edges)
    for (const e of chain.errors) {
      validationErrors.push(`chain: ${e}`)
    }

    return res.json({
      role: 'assistant' as const,
      content: lastContent,
      finish_reason: lastFinishReason,
      validatedPatches: chain.validPatches,
      validationErrors,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
})
