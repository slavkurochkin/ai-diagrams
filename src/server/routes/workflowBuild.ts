import { Router } from 'express'
import OpenAI from 'openai'
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions'
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

- **addNode** — { op, id, nodeType, label?, config?, position? } (omit \`position\` for spaced auto-layout on the canvas)
- **removeNode** — { op, id }
- **addEdge** — { op, id, source, target, sourceHandle?, targetHandle? } (use node ids; omit handles to auto-connect, or set catalog port ids)
- **removeEdge** — { op, id } (must match \`edge id\` shown on each connection line in Current flow)
- **setNodeConfig** — { op, nodeId, config, merge? } (merge defaults true; if false, resets to defaults then applies config)
- **setNodeLabel** — { op, nodeId, label }

Rules:
- Use only node \`type\` values that appear in the catalog.
- **addEdge** \`source\` / \`target\`: prefer the exact \`id:\` strings from **Current flow**. You may also use a node's \`label\` or \`nodeType\` when it uniquely identifies one node on the canvas — never invent names that are not in **Current flow** unless you \`addNode\` them in the same patch batch. Patches are applied with all \`addNode\` steps before \`addEdge\`, so new nodes exist before edges run.
- **Ports:** use catalog port \`id\` strings (e.g. **guardrails** outputs are \`passed\` and \`blocked\`, not \`output\`; **outputParser** output is \`structured\`). If unsure, **omit** \`sourceHandle\` and \`targetHandle\` on \`addEdge\` so the server picks sensible defaults.
- Prefer small, incremental patches. Explain your reasoning in normal assistant text, then call the tool when the user wants concrete graph changes.
- If Agent use-case context is present, treat it as authoritative constraints; keep proposals aligned with it.

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

workflowBuildRouter.get('/node-catalog', (_req, res) => {
  res.json(getNodeCatalogForAI())
})

workflowBuildRouter.post('/workflow-build', async (req, res) => {
  const body = req.body as WorkflowBuildRequest
  const { messages, nodes = [], edges = [], flowName, flowContext = null } = body

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

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY not set on server' })
  }

  const systemPrompt = buildSystemPrompt(flowName ?? 'Untitled', nodes, edges, flowContext)
  const openaiMessages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ]

  try {
    const client = new OpenAI({ apiKey })
    const maxRepair = maxPatchRepairRounds()

    let conversation: ChatCompletionMessageParam[] = openaiMessages
    let workingNodes: SerializedNode[] = nodes
    let workingEdges: SerializedEdge[] = edges
    let lastContent: string | null = null
    let lastFinishReason: string | null = null
    const patchAccumulator: WorkflowPatch[] = []
    const validationErrors: string[] = []

    for (let attempt = 0; attempt <= maxRepair; attempt++) {
      const completion = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: conversation,
        tools: [WORKFLOW_PATCH_TOOL],
        tool_choice: 'auto',
      })

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
