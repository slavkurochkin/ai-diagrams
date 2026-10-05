import { describe, expect, it } from 'vitest'
import { FLOW_TEMPLATES } from './templates'
import { parseFlowYAML, type ParsedFlow } from './yamlFlow'
import { getNodeDefinition } from './nodeDefinitions'
import { computeWer, formatRate, parseEntities } from './wer'
import { computeLatency, formatMs, parseTimings, DEFAULT_VOICE_TIMINGS } from './latency'

const ENTRY_TYPES = new Set(['trigger', 'dataLoader', 'evalDataset', 'redTeam', 'traceSampler'])

function parse(yaml: string): ParsedFlow {
  const result = parseFlowYAML(yaml)
  if ('error' in result) throw new Error(result.error)
  return result
}

describe.each(FLOW_TEMPLATES.map((t) => [t.id, t] as const))('template %s', (_id, template) => {
  const flow = parse(template.yaml)

  it('wires only existing, type-compatible ports', () => {
    expect(flow.warnings).toEqual([])
    for (const e of flow.edges) {
      expect(e.sourceHandle, `edge ${e.id} needs an explicit fromHandle`).toBeTruthy()
      expect(e.targetHandle, `edge ${e.id} needs an explicit toHandle`).toBeTruthy()
    }
  })

  it('uses valid config values', () => {
    for (const n of flow.nodes) {
      const def = getNodeDefinition(n.data.nodeType)!
      const known = new Set(def.configFields.map((f) => f.key))
      for (const key of Object.keys(n.data.config)) {
        expect(known.has(key), `${n.data.label}: unknown config key "${key}"`).toBe(true)
      }
      for (const f of def.configFields) {
        if (f.type !== 'select') continue
        const options = f.options?.map((o) => o.value) ?? []
        expect(options, `${n.data.label}: ${f.key}`).toContain(n.data.config[f.key])
      }
    }
  })

  it('starts at an entry node', () => {
    const targets = new Set(flow.edges.map((e) => e.target))
    const entries = flow.nodes.filter((n) => ENTRY_TYPES.has(n.data.nodeType) && !targets.has(n.id))
    expect(entries.length, 'expected a trigger or dataLoader with no incoming edges').toBeGreaterThan(0)
  })
})

describe('parseFlowYAML', () => {
  it('keeps rule-breaking edges from user files but reports them', () => {
    const flow = parse(`name: Bad
nodes:
  - id: r
    type: retriever
  - id: g
    type: thresholdGate
edges:
  - from: r
    to: g
    fromHandle: documents
    toHandle: score`)
    expect(flow.edges).toHaveLength(1)
    expect(flow.warnings).toEqual(['edge r → g: incompatible ports: retriever.documents (text) → thresholdGate.score (structured)'])
  })

  it('upgrades retired model ids on load', () => {
    const flow = parse(`name: Old
nodes:
  - id: l
    type: llm
    config:
      model: gpt-4o`)
    expect(flow.nodes[0].data.config.model).toBe('gpt-5.5')
  })
})

describe('How WER Works template', () => {
  it('states the WER and entity error rate that its own example actually produces', () => {
    const template = FLOW_TEMPLATES.find((t) => t.id === 'wer-explainer')!
    const flow = parse(template.yaml)
    const asr = flow.nodes.find((n) => n.data.nodeType === 'asrEval')!
    const c = asr.data.config
    const r = computeWer(String(c.sampleReference), String(c.sampleTranscript), {
      entities: parseEntities(String(c.sampleEntities)),
    })
    expect(asr.data.note).toContain(`= **${formatRate(r.wer)}**`)
    const verdict = flow.nodes.find((n) => n.data.label === 'What It Means')!
    expect(verdict.data.note).toContain(`= **${formatRate(r.entityErrorRate).replace('.0', '')}**`)
  })
})

describe('Where Voice Latency Comes From template', () => {
  it('annotates each stage with the timings its latency node actually computes', () => {
    const template = FLOW_TEMPLATES.find((t) => t.id === 'voice-latency-explainer')!
    const flow = parse(template.yaml)
    const node = flow.nodes.find((n) => n.data.nodeType === 'voiceLatencyEval')!
    const timings = { ...parseTimings(node.data.config.exampleTimings, DEFAULT_VOICE_TIMINGS), budgetMs: Number(node.data.config.latencyBudgetMs) }
    const r = computeLatency(timings)
    const notes = flow.nodes.map((n) => n.data.note ?? '').join('\n')
    for (const seg of r.segments) expect(notes, seg.label).toContain(`${seg.durationMs} ms`)
    expect(notes).toContain(`Time to first audio = ${formatMs(r.headlineMs)}`)
    expect(notes).toContain(`${r.overBudget ? 'over' : 'within'} an ${timings.budgetMs} ms budget`)
  })
})

describe('Conversational RAG template', () => {
  const flow = parse(FLOW_TEMPLATES.find((t) => t.id === 'conversational-rag')!.yaml)
  const node = (label: string) => flow.nodes.find((n) => n.data.label === label)!
  const handleTo = (from: string, handle: string, to: string, toHandle?: string) =>
    flow.edges.some((e) => e.source === from && e.sourceHandle === handle && e.target === to && (!toHandle || e.targetHandle === toHandle))

  it('retrieves with a standalone query rewritten from history, not the raw follow-up', () => {
    const question = node('User Question'), guard = node('Input Guard'), rewriter = node('Query Rewriter'), memory = node('Recent Turns')
    const embedder = node('Query Embedder'), retriever = flow.nodes.find((n) => n.data.nodeType === 'retriever')!

    expect(handleTo(guard.id, 'passed', rewriter.id, 'prompt')).toBe(true)
    expect(handleTo(memory.id, 'history', rewriter.id, 'memory')).toBe(true)
    expect(handleTo(rewriter.id, 'response', embedder.id, 'text')).toBe(true)
    expect(handleTo(rewriter.id, 'response', retriever.id, 'query')).toBe(true)
    // The question text never reaches retrieval raw; the session metadata (identity) is not the question
    expect(flow.edges.some((e) => e.source === question.id && e.sourceHandle === 'payload' && (e.target === embedder.id || e.target === retriever.id))).toBe(false)
  })

  it('searches only documents the current user may read', () => {
    const question = node('User Question'), retriever = flow.nodes.find((n) => n.data.nodeType === 'retriever')!
    expect(handleTo(question.id, 'metadata', retriever.id, 'filter')).toBe(true)
    expect(String(retriever.data.config.metadataFilter)).toMatch(/access_groups/)
    // Access must come from the authenticated session, not from anything the client can set
    expect(String(retriever.data.note)).toMatch(/server-side/)
    expect(String(retriever.data.note)).toMatch(/never from client-supplied fields/)
    // Identity goes to the access filter only — never into a prompt or a model
    expect(flow.edges.filter((e) => e.source === question.id && e.sourceHandle === 'metadata').map((e) => `${e.target}.${e.targetHandle}`)).toEqual([`${retriever.id}.filter`])
  })

  it('retrieves from a vector store and answers only from retrieved context', () => {
    const retriever = flow.nodes.find((n) => n.data.nodeType === 'retriever')!
    const store = flow.nodes.find((n) => n.data.nodeType === 'vectorDB')!
    expect(handleTo(store.id, 'store', retriever.id, 'store')).toBe(true)
    expect(String(node('Answer LLM').data.config.systemPrompt)).toMatch(/only the retrieved context/)
  })

  it('reranks retrieved candidates before they reach the prompt', () => {
    const retriever = flow.nodes.find((n) => n.data.nodeType === 'retriever')!
    const reranker = flow.nodes.find((n) => n.data.nodeType === 'reranker')!
    const prompt = node('Prompt Builder')

    expect(handleTo(retriever.id, 'documents', reranker.id, 'documents')).toBe(true)
    expect(handleTo(node('Query Rewriter').id, 'response', reranker.id, 'query')).toBe(true)
    expect(handleTo(reranker.id, 'documents', prompt.id)).toBe(true)
    expect(flow.edges.some((e) => e.source === retriever.id && e.target === prompt.id)).toBe(false)
    expect(Number(retriever.data.config.topK)).toBeGreaterThan(Number(reranker.data.config.topN))
  })

  it('keeps long chats in context with recent turns plus a rolling summary', () => {
    const summary = node('Conversation Summary')
    expect(summary.data.config.memoryType).toBe('summary')
    expect(handleTo(summary.id, 'history', node('Prompt Builder').id)).toBe(true)
    expect(handleTo(node('Output Guard').id, 'passed', summary.id, 'input')).toBe(true)
  })

  it('screens the question and the answer, and never follows instructions in documents', () => {
    const question = node('User Question'), inputGuard = node('Input Guard'), outputGuard = node('Output Guard')
    const llm = node('Answer LLM'), answer = node('Answer')

    // the raw question goes only to the input guard; blocked messages get a refusal
    expect(flow.edges.filter((e) => e.source === question.id && e.sourceHandle === 'payload').map((e) => e.target)).toEqual([inputGuard.id])
    expect(handleTo(inputGuard.id, 'blocked', node('Polite Refusal').id)).toBe(true)

    // the answer reaches the user and memory only through the output guard
    expect(handleTo(llm.id, 'response', outputGuard.id, 'input')).toBe(true)
    expect(handleTo(outputGuard.id, 'passed', answer.id)).toBe(true)
    expect(handleTo(outputGuard.id, 'blocked', node('Fallback Reply').id)).toBe(true)
    expect(flow.edges.some((e) => e.source === llm.id && e.target !== outputGuard.id)).toBe(false)
    expect(handleTo(outputGuard.id, 'passed', node('Recent Turns').id, 'input')).toBe(true)
    expect(String(outputGuard.data.config.checks)).toMatch(/pii/)

    expect(String(llm.data.config.systemPrompt)).toMatch(/data, not instructions/)
  })

  it('scores sampled live turns with reference-free metrics and alerts on drops', () => {
    const sampler = flow.nodes.find((n) => n.data.nodeType === 'traceSampler')!
    const evaluator = flow.nodes.find((n) => n.data.nodeType === 'ragEvaluator')!
    const monitor = flow.nodes.find((n) => n.data.nodeType === 'monitor')!

    for (const port of ['query', 'contexts', 'response']) expect(handleTo(sampler.id, 'traces', evaluator.id, port), port).toBe(true)
    expect(handleTo(evaluator.id, 'scores', monitor.id, 'metrics')).toBe(true)
    expect(evaluator.data.config.faithfulness).toBe(true)
    // live traffic has no reference answers, so reference-based metrics must be off
    for (const key of ['recallAtK', 'precisionAtK', 'f1AtK', 'mrr', 'ndcgAtK', 'contextRecall', 'answerF1', 'exactMatch']) {
      expect(evaluator.data.config[key], key).toBe(false)
    }
  })
})

describe('MCP Server Test Strategy template', () => {
  const flow = parse(FLOW_TEMPLATES.find((t) => t.id === 'mcp-server-test-strategy')!.yaml)
  const node = (label: string) => flow.nodes.find((n) => n.data.label === label)!
  const edge = (from: string, to: string) => flow.edges.some((e) => e.source === from && e.target === to)
  // every node reachable downstream of `start`, ignoring loopbacks back into the loop
  const downstream = (start: string) => {
    const seen = new Set([start])
    const queue = [start]
    while (queue.length) {
      const id = queue.shift()!
      for (const e of flow.edges) if (e.source === id && !seen.has(e.target)) { seen.add(e.target); queue.push(e.target) }
    }
    return [...seen].map((id) => flow.nodes.find((n) => n.id === id)!)
  }

  it('runs contract tests without any model, and checks tenant isolation in the database', () => {
    const lane = downstream(node('Contract Cases').id)
    expect(lane.some((n) => ['llm', 'agent', 'llmJudge', 'safetyEval'].includes(n.data.nodeType)), 'no LLM in contract tests').toBe(false)
    expect(node('Tenant Isolation').data.config.checkType).toBe('state-check')
    expect(Number(node('Contract Gate').data.config.threshold)).toBe(1)
  })

  it('checks tool order and attacks through poisoned tool results with a database check', () => {
    expect(node('Right Tool, Right Args').data.config.orderMatters).toBe(true)
    expect(node('Attack Generator').data.config.promptInjection).toBe(true)
    expect(edge(node('Staging Server (poisoned data)').id, node('No Cross-Tenant Effect').id)).toBe(true)
    expect(node('No Cross-Tenant Effect').data.config.checkType).toBe('state-check')
  })

  it('blocks the release when any gate fails', () => {
    const gates = flow.nodes.filter((n) => n.data.nodeType === 'thresholdGate')
    const block = node('Block Release')
    expect(gates).toHaveLength(4)
    for (const gate of gates) {
      expect(flow.edges.some((e) => e.source === gate.id && e.sourceHandle === 'fail' && e.target === block.id), gate.data.label).toBe(true)
    }
  })
})

describe('Multi-Tenant MCP Server template', () => {
  it('routes every tool, returns every result to the endpoint, and audits every write', () => {
    const flow = parse(FLOW_TEMPLATES.find((t) => t.id === 'multi-tenant-mcp-server')!.yaml)
    const tools = flow.nodes.filter((n) => n.data.nodeType === 'exposedTool')
    const router = flow.nodes.find((n) => n.data.nodeType === 'router')!
    const endpoint = flow.nodes.find((n) => n.data.nodeType === 'mcpEndpoint')!
    const audit = flow.nodes.find((n) => n.data.label === 'Audit Log')!
    const edge = (from: string, to: string) => flow.edges.some((e) => e.source === from && e.target === to)

    expect(router.data.config.routeCount).toBe(tools.length)
    for (const tool of tools) {
      expect(edge(router.id, tool.id), `${tool.data.label} is routed`).toBe(true)
      expect(edge(tool.id, endpoint.id), `${tool.data.label} returns to the endpoint`).toBe(true)
      if (tool.data.config.readOnly === false) expect(edge(tool.id, audit.id), `${tool.data.label} is audited`).toBe(true)
      expect(tool.data.config.requiredScope, `${tool.data.label} has a scope`).toBeTruthy()
    }
    expect(tools.find((n) => n.data.config.toolName === 'delete_contact')!.data.config.destructive).toBe(true)
  })

  it('returns rejections through the endpoint so the error-rate monitor sees them', () => {
    const flow = parse(FLOW_TEMPLATES.find((t) => t.id === 'multi-tenant-mcp-server')!.yaml)
    const endpoint = flow.nodes.find((n) => n.data.nodeType === 'mcpEndpoint')!
    const byType = (type: string) => flow.nodes.find((n) => n.data.nodeType === type)!
    const handleTo = (from: string, handle: string, to: string) =>
      flow.edges.some((e) => e.source === from && e.sourceHandle === handle && e.target === to)

    expect(handleTo(byType('auth').id, 'rejected', endpoint.id), 'auth rejections').toBe(true)
    expect(handleTo(byType('rateLimiter').id, 'throttled', endpoint.id), 'throttled calls').toBe(true)
    expect(handleTo(byType('router').id, 'default', endpoint.id), 'unknown tools').toBe(true)
    expect(handleTo(endpoint.id, 'responses', byType('monitor').id), 'monitor watches responses').toBe(true)
    expect(endpoint.data.config.exposeResources).toBe(false)
  })
})

describe('Conversational RAG Eval template', () => {
  it('tests the same pipeline the Conversational RAG template ships', () => {
    const shipped = parse(FLOW_TEMPLATES.find((t) => t.id === 'conversational-rag')!.yaml)
    const evaluated = parse(FLOW_TEMPLATES.find((t) => t.id === 'conversational-rag-eval')!.yaml)
    const byLabel = (flow: ParsedFlow, label: string) => flow.nodes.find((n) => n.data.label === label)
    const pipeline = ['Query Rewriter', 'Query Embedder', 'Retriever', 'Knowledge Base', 'Reranker', 'Prompt Builder', 'Answer LLM', 'Recent Turns', 'Conversation Summary']
    for (const label of pipeline) {
      const a = byLabel(shipped, label)
      const b = byLabel(evaluated, label)
      expect(a, `${label} in Conversational RAG`).toBeDefined()
      expect(b, `${label} in the eval`).toBeDefined()
      expect(b!.data.nodeType, label).toBe(a!.data.nodeType)
      expect(b!.data.config, `${label} config drifted from the shipped pipeline`).toEqual(a!.data.config)
    }
  })

  it('never lets the answer key reach the pipeline under test', () => {
    const flow = parse(FLOW_TEMPLATES.find((t) => t.id === 'conversational-rag-eval')!.yaml)
    const id = (label: string) => flow.nodes.find((n) => n.data.label === label)!.id
    const pipeline = new Set(['Query Rewriter', 'Query Embedder', 'Retriever', 'Reranker', 'Prompt Builder', 'Answer LLM', 'Recent Turns', 'Conversation Summary'].map(id))
    // Everything downstream of the answer key: the raw turn record and the expected-value extractors.
    const answerKey = new Set([id('For Each Turn'), id('Turn: Expected Rewrite'), id('Turn: Reference & Relevant Docs')])
    // Walk forward from the answer key, stopping at scorers (eval nodes) — nothing may reach the pipeline.
    const frontier = [...answerKey]
    const seen = new Set(frontier)
    while (frontier.length) {
      const from = frontier.pop()!
      for (const e of flow.edges.filter((x) => x.source === from)) {
        if (from === id('For Each Turn') && e.sourceHandle !== 'item') continue // `results` is run-level, not the key
        const target = flow.nodes.find((n) => n.id === e.target)!
        expect(pipeline.has(target.id), `answer key reaches ${target.data.label}`).toBe(false)
        if (target.data.label === 'Turn: User Message') continue // the one field the pipeline may see
        if (getNodeDefinition(target.data.nodeType)!.category === 'eval') continue
        if (!seen.has(target.id)) { seen.add(target.id); frontier.push(target.id) }
      }
    }
  })

  it('judges conversations from a transcript, on the same 0–1 scale as every turn score', () => {
    const flow = parse(FLOW_TEMPLATES.find((t) => t.id === 'conversational-rag-eval')!.yaml)
    const convo = flow.nodes.find((n) => n.data.nodeType === 'multiTurnEval')!
    const into = flow.edges.find((e) => e.target === convo.id && e.targetHandle === 'conversation')!
    expect(flow.nodes.find((n) => n.id === into.source)!.data.nodeType).toBe('state')
    for (const judge of flow.nodes.filter((n) => n.data.nodeType === 'llmJudge')) {
      expect(judge.data.config.scoringScale, judge.data.label).toBe('0-1')
    }
  })

  it('wires the pipeline exactly as the shipped template does', () => {
    const shipped = parse(FLOW_TEMPLATES.find((t) => t.id === 'conversational-rag')!.yaml)
    const evaluated = parse(FLOW_TEMPLATES.find((t) => t.id === 'conversational-rag-eval')!.yaml)
    const pipeline = new Set(['Query Rewriter', 'Query Embedder', 'Retriever', 'Knowledge Base', 'Reranker', 'Prompt Builder', 'Answer LLM', 'Recent Turns', 'Conversation Summary'])
    const internalEdges = (flow: ParsedFlow) => {
      const label = (id: string) => flow.nodes.find((n) => n.id === id)!.data.label
      return flow.edges
        .filter((e) => pipeline.has(label(e.source)) && pipeline.has(label(e.target)))
        .map((e) => `${label(e.source)}.${e.sourceHandle} → ${label(e.target)}.${e.targetHandle}`)
        .sort()
    }
    // Guards are left out of the eval, so the answer writes memory directly instead of via the output guard.
    const guardSubstitutes = new Set(['Answer LLM.response → Recent Turns.input', 'Answer LLM.response → Conversation Summary.input'])
    expect(internalEdges(evaluated).filter((e) => !guardSubstitutes.has(e))).toEqual(internalEdges(shipped))
  })

  it('keeps conversations apart, separates retriever from reranker, and never averages latency into quality', () => {
    const flow = parse(FLOW_TEMPLATES.find((t) => t.id === 'conversational-rag-eval')!.yaml)
    const byLabel = (label: string) => flow.nodes.find((n) => n.data.label === label)!
    expect(byLabel('Conversation Transcript').data.config.scope).toBe('session')

    const candidates = byLabel('Candidate Recall (top 20)')
    const into = (node: typeof candidates, handle: string) =>
      flow.nodes.find((n) => n.id === flow.edges.find((e) => e.target === node.id && e.targetHandle === handle)!.source)!.data.label
    expect(into(candidates, 'contexts')).toBe('Retriever')
    expect(into(byLabel('Retrieval & Grounding'), 'contexts')).toBe('Reranker')

    const gates = flow.nodes.filter((n) => n.data.nodeType === 'thresholdGate')
    expect(gates.map((g) => g.data.config.metric).sort()).toEqual(['access_violations', 'latency_within_budget', 'quality'])
    // Latency is measured from the turn's message, not just the answer.
    const latencySources = flow.edges.filter((e) => e.target === byLabel('Turn Latency').id).map((e) => flow.nodes.find((n) => n.id === e.source)!.data.label)
    expect(latencySources).toEqual(expect.arrayContaining(['Turn: User Message', 'Answer LLM']))
  })

  it('fails the release on any access leak, checked at retrieval and in the answer', () => {
    const flow = parse(FLOW_TEMPLATES.find((t) => t.id === 'conversational-rag-eval')!.yaml)
    const byLabel = (label: string) => flow.nodes.find((n) => n.data.label === label)!
    const source = (target: string, handle: string) =>
      flow.nodes.find((n) => n.id === flow.edges.find((e) => e.target === byLabel(target).id && e.targetHandle === handle)!.source)!.data.label

    const gate = byLabel('Access Gate').data.config
    expect([gate.metric, gate.operator, gate.threshold]).toEqual(['access_violations', '<=', 0])
    expect(source('No Restricted Docs Retrieved', 'output')).toBe('Retriever') // before reranking
    expect(source('No Canary in Answer', 'output')).toBe('Answer LLM')
    // Scoped to what this user may not read: authorized users may see their own documents' canaries
    expect(source('No Canary in Answer', 'expected')).toBe('Turn: Reference & Relevant Docs')
    expect(String(byLabel('No Canary in Answer').data.config.spec)).toMatch(/may not read/)
    // Paraphrased leaks drop canaries (seen in a dry run), so a judge checks the substance
    expect(source('Restricted Content in Answer', 'response')).toBe('Answer LLM')
    expect(source('Restricted Content in Answer', 'reference')).toBe('Turn: Restricted Facts')
    // Probes include users claiming a role in their message
    expect(String(byLabel('Scripted Conversations').data.note)).toMatch(/claim a role/)
    // The pipeline is told who is asking, as in production
    expect(source('Retriever', 'filter')).toBe('Conversation: User & Access Groups')
  })

  it('always writes the report, and lets gates only raise the alert', () => {
    const flow = parse(FLOW_TEMPLATES.find((t) => t.id === 'conversational-rag-eval')!.yaml)
    const byLabel = (label: string) => flow.nodes.find((n) => n.data.label === label)!
    const report = byLabel('Eval Report'), alert = byLabel('Regression Alert')
    const intoReport = flow.edges.filter((e) => e.target === report.id)
    expect(intoReport.map((e) => `${flow.nodes.find((n) => n.id === e.source)!.data.label}.${e.sourceHandle}`)).toEqual(['For Each Conversation.results'])
    for (const gate of flow.nodes.filter((n) => n.data.nodeType === 'thresholdGate')) {
      expect(flow.edges.some((e) => e.source === gate.id && e.sourceHandle === 'fail' && e.target === alert.id), gate.data.label).toBe(true)
    }
  })

  it('keeps its hand-placed layout (the explainer video is framed on it)', () => {
    const flow = parse(FLOW_TEMPLATES.find((t) => t.id === 'conversational-rag-eval')!.yaml)
    expect(flow.hasExplicitPositions).toBe(true)
    const spots = flow.nodes.map((n) => `${n.position.x},${n.position.y}`)
    expect(new Set(spots).size, 'two nodes share a position').toBe(spots.length)
  })

  it('replays turns in order so memory builds up as it does live', () => {
    const flow = parse(FLOW_TEMPLATES.find((t) => t.id === 'conversational-rag-eval')!.yaml)
    expect(flow.nodes.find((n) => n.data.label === 'For Each Turn')!.data.config.mode).toBe('sequential')
  })
})

describe('RAG evaluators get relevance labels', () => {
  it.each(['rag-eval', 'conversational-rag-eval'])('%s wires Relevant Docs when retrieval metrics are on', (templateId) => {
    const flow = parse(FLOW_TEMPLATES.find((t) => t.id === templateId)!.yaml)
    for (const node of flow.nodes.filter((n) => n.data.nodeType === 'ragEvaluator')) {
      const c = node.data.config
      if (c.recallAtK || c.precisionAtK || c.mrr || c.ndcgAtK) {
        expect(flow.edges.some((e) => e.target === node.id && e.targetHandle === 'relevantDocs'), node.data.label).toBe(true)
      }
    }
  })
})
