import { Router } from 'express'
import { createLLMClient, getApiKeyError, type Provider } from '../lib/llmProvider.js'
import type { ChatCompletionTool } from 'openai/resources/chat/completions'

export const parallelJudgeRouter = Router()

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

interface JudgeCandidate {
  id: string
  label: string
  nodes: SerializedNode[]
  edges: SerializedEdge[]
  assistantSummary?: string
}

interface ParallelJudgeRequest {
  provider: Provider
  prompt: string
  candidates: JudgeCandidate[]
}

interface JudgeDesignScore {
  designId: string
  score: number
  reasoning: string
}

interface JudgeDecisionPayload {
  winnerId: string
  overallReasoning: string
  scores: JudgeDesignScore[]
}

const JUDGE_DECISION_TOOL: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'submit_judge_decision',
    description:
      'Submit a structured blind-judge decision with one winner and scores for every candidate design.',
    parameters: {
      type: 'object',
      properties: {
        winnerId: { type: 'string' },
        overallReasoning: { type: 'string' },
        scores: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              designId: { type: 'string' },
              score: { type: 'integer', minimum: 0, maximum: 100 },
              reasoning: { type: 'string' },
            },
            required: ['designId', 'score', 'reasoning'],
            additionalProperties: false,
          },
        },
      },
      required: ['winnerId', 'overallReasoning', 'scores'],
      additionalProperties: false,
    },
  },
}

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function candidateAliasMap(candidates: JudgeCandidate[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const candidate of candidates) {
    const idToken = normalizeToken(candidate.id)
    const labelToken = normalizeToken(candidate.label)
    map.set(idToken, candidate.id)
    map.set(labelToken, candidate.id)
    // design-1 / design1 aliases
    const numeric = candidate.id.match(/(\d+)/)?.[1]
    if (numeric) {
      map.set(normalizeToken(`design-${numeric}`), candidate.id)
      map.set(normalizeToken(`design ${numeric}`), candidate.id)
    }
    // design-a / designa aliases by label suffix
    const suffix = candidate.label.match(/([A-Za-z])$/)?.[1]
    if (suffix) {
      map.set(normalizeToken(`design-${suffix}`), candidate.id)
      map.set(normalizeToken(`design ${suffix}`), candidate.id)
    }
  }
  return map
}

function graphToText(nodes: SerializedNode[], edges: SerializedEdge[]): string {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
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
    return `- ${srcLabel} → ${tgtLabel}${handles}`
  })

  return [
    `Nodes (${nodes.length}):`,
    ...nodeLines,
    '',
    `Connections (${edges.length}):`,
    ...edgeLines,
  ].join('\n')
}

function buildJudgePrompt(prompt: string, candidates: JudgeCandidate[]): string {
  const candidateBlocks = candidates
    .map((candidate) => {
      const summary = candidate.assistantSummary?.trim()
        ? `\nBuilder note:\n${candidate.assistantSummary.trim()}\n`
        : ''
      return [
        `## ${candidate.label} (id: ${candidate.id})`,
        summary,
        graphToText(candidate.nodes, candidate.edges),
      ].join('\n')
    })
    .join('\n\n---\n\n')

  const candidateIds = candidates.map((c) => c.id).join(', ')

  return `You are an impartial workflow design judge.

You must compare multiple AI workflow designs blindly. You are NOT given any information about which LLM created each design.
Judge only based on architecture quality, correctness, completeness, robustness, and maintainability for the user's goal.

User request:
${prompt}

Design candidates:
${candidateBlocks}

Use the function tool "submit_judge_decision" to return your decision.
Valid design ids for this run: ${candidateIds}

Rules:
- Include exactly one scores entry per design candidate id.
- winnerId must match one candidate id.
- score must be an integer between 0 and 100.
- No markdown, no prose outside JSON.`
}

function parseJudgeDecision(raw: string, candidates: JudgeCandidate[]): JudgeDecisionPayload {
  const candidateIds = candidates.map((c) => c.id)
  const aliases = candidateAliasMap(candidates)

  const normalizeId = (rawId: string): string => {
    if (candidateIds.includes(rawId)) return rawId
    const normalized = aliases.get(normalizeToken(rawId))
    if (normalized) return normalized
    return rawId
  }

  let parsedValue: unknown
  try {
    parsedValue = JSON.parse(raw)
  } catch {
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start < 0 || end <= start) throw new Error('judge output is not valid JSON')
    parsedValue = JSON.parse(raw.slice(start, end + 1))
  }
  const parsed = parsedValue as JudgeDecisionPayload
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('invalid judge output')
  }
  parsed.winnerId = normalizeId(String(parsed.winnerId ?? ''))
  if (!candidateIds.includes(parsed.winnerId)) {
    throw new Error('winnerId does not match candidates')
  }
  if (!Array.isArray(parsed.scores) || parsed.scores.length !== candidateIds.length) {
    throw new Error('scores must include all candidates')
  }
  for (const s of parsed.scores) {
    s.designId = normalizeId(String(s.designId ?? ''))
  }
  const idsInScores = new Set(parsed.scores.map((s) => s.designId))
  for (const id of candidateIds) {
    if (!idsInScores.has(id)) throw new Error(`missing score for ${id}`)
  }
  for (const score of parsed.scores) {
    if (!candidateIds.includes(score.designId)) throw new Error('unknown designId in scores')
    if (!Number.isInteger(score.score) || score.score < 0 || score.score > 100) {
      throw new Error('score must be integer 0..100')
    }
    if (typeof score.reasoning !== 'string') throw new Error('score reasoning must be text')
  }
  if (typeof parsed.overallReasoning !== 'string') {
    throw new Error('overallReasoning must be text')
  }
  return parsed
}

function completeMissingScores(
  decision: JudgeDecisionPayload,
  candidates: JudgeCandidate[],
): JudgeDecisionPayload {
  const candidateIds = candidates.map((c) => c.id)
  const byId = new Map<string, JudgeDesignScore>()
  for (const s of decision.scores) {
    if (!byId.has(s.designId)) byId.set(s.designId, s)
  }
  const existing = Array.from(byId.values())
  const baseline =
    existing.length > 0
      ? Math.round(existing.reduce((acc, s) => acc + s.score, 0) / existing.length)
      : 60

  const completedScores: JudgeDesignScore[] = candidateIds.map((id) => {
    const existingScore = byId.get(id)
    if (existingScore) return existingScore
    return {
      designId: id,
      score: baseline,
      reasoning:
        'Score inferred by validator because the judge omitted this candidate in its response.',
    }
  })

  let winnerId = decision.winnerId
  if (!candidateIds.includes(winnerId)) {
    winnerId = completedScores
      .slice()
      .sort((a, b) => b.score - a.score)[0]?.designId ?? candidateIds[0]
  }

  return {
    winnerId,
    overallReasoning: decision.overallReasoning,
    scores: completedScores,
  }
}

function heuristicFallbackDecision(candidates: JudgeCandidate[]): JudgeDecisionPayload {
  const scored = candidates.map((candidate) => {
    const nodeCount = candidate.nodes.length
    const edgeCount = candidate.edges.length
    const hasTerminal = candidate.nodes.some((n) => {
      const t = n.nodeType.toLowerCase()
      return t === 'prompt' || t === 'outputparser' || t === 'outputParser'
    })
    const complexityPenalty = Math.max(0, nodeCount - 14) * 1.5
    const base = 40 + nodeCount * 2 + edgeCount * 1.5 + (hasTerminal ? 4 : 0) - complexityPenalty
    const score = Math.max(0, Math.min(100, Math.round(base)))
    return {
      designId: candidate.id,
      score,
      reasoning:
        `Fallback heuristic score from structure only: ${nodeCount} nodes, ${edgeCount} edges` +
        `${hasTerminal ? ', terminal output present.' : ', terminal output not clearly detected.'}`,
    }
  })

  const winner = scored.slice().sort((a, b) => b.score - a.score)[0]
  return {
    winnerId: winner?.designId ?? candidates[0]?.id ?? 'design-1',
    overallReasoning:
      'Used fallback scoring because the judge model response could not be parsed into valid structured output.',
    scores: scored,
  }
}

async function repairJudgeJson(
  client: ReturnType<typeof createLLMClient>['client'],
  model: string,
  raw: string,
  candidates: JudgeCandidate[],
): Promise<string> {
  const ids = candidates.map((c) => c.id).join(', ')
  const completion = await client.chat.completions.create({
    model,
    temperature: 0,
    max_tokens: 900,
    messages: [
      {
        role: 'system',
        content: 'Convert judge output into strict JSON only. No markdown.',
      },
      {
        role: 'user',
        content: `Rewrite this into valid JSON with exact candidate ids [${ids}] and fields winnerId, overallReasoning, scores[].

Raw output:
${raw}`,
      },
    ],
  })
  return completion.choices[0]?.message?.content?.trim() ?? ''
}

function extractDecisionFromToolCalls(
  toolCalls: Array<{
    type?: string
    function?: { name?: string; arguments?: string }
  }>,
): JudgeDecisionPayload | null {
  for (const tc of toolCalls) {
    if (tc.type !== 'function') continue
    if (tc.function?.name !== 'submit_judge_decision') continue
    const args = tc.function.arguments?.trim()
    if (!args) continue
    try {
      return JSON.parse(args) as JudgeDecisionPayload
    } catch {
      continue
    }
  }
  return null
}

parallelJudgeRouter.post('/parallel-judge', async (req, res) => {
  const body = req.body as ParallelJudgeRequest
  const { provider, prompt, candidates } = body

  if (!provider) return res.status(400).json({ error: 'provider is required' })
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'prompt is required' })
  }
  if (!Array.isArray(candidates) || candidates.length < 2) {
    return res.status(400).json({ error: 'at least two candidates are required' })
  }

  const keyError = getApiKeyError(provider)
  if (keyError) return res.status(500).json({ error: keyError })

  try {
    const { client, model } = createLLMClient(provider)
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.1,
      max_tokens: 1400,
      tools: [JUDGE_DECISION_TOOL],
      tool_choice: 'auto',
      messages: [
        {
          role: 'system',
          content: 'You are a rigorous architecture judge. Return strict JSON only.',
        },
        {
          role: 'user',
          content: buildJudgePrompt(prompt, candidates),
        },
      ],
    })

    const content = completion.choices[0]?.message?.content?.trim() ?? ''

    let decision: JudgeDecisionPayload | null = null
    const toolDecision = extractDecisionFromToolCalls(
      (completion.choices[0]?.message?.tool_calls ?? []) as Array<{
        type?: string
        function?: { name?: string; arguments?: string }
      }>,
    )

    try {
      if (toolDecision) {
        decision = parseJudgeDecision(JSON.stringify(toolDecision), candidates)
      } else if (content) {
        decision = parseJudgeDecision(content, candidates)
      } else {
        throw new Error('judge returned empty response')
      }
    } catch (firstErr) {
      let repairedText = content
      let parsedOk = false
      for (let i = 0; i < 2; i++) {
        repairedText = await repairJudgeJson(client, model, repairedText, candidates)
        if (!repairedText) continue
        try {
          decision = parseJudgeDecision(repairedText, candidates)
          parsedOk = true
          break
        } catch {
          // continue repair loop
        }
      }
      if (!parsedOk) {
        let bestEffort: JudgeDecisionPayload | null = null
        try {
          bestEffort = parseJudgeDecision(repairedText || content, candidates)
        } catch {
          // Final fallback: never fail the endpoint on judge formatting drift.
          decision = heuristicFallbackDecision(candidates)
          parsedOk = true
          const msg = firstErr instanceof Error ? firstErr.message : String(firstErr)
          decision.overallReasoning += ` Original parse error: ${msg}`
        }
        if (!parsedOk && bestEffort) {
          decision = completeMissingScores(bestEffort, candidates)
          // Validate final shape after completion.
          decision = parseJudgeDecision(JSON.stringify(decision), candidates)
        }
      }
    }
    if (!decision) throw new Error('judge output could not be parsed')
    return res.json({
      provider,
      model,
      decision,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
})

