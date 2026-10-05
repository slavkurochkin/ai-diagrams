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
    const question = node('User Question'), rewriter = node('Query Rewriter'), memory = node('Conversation Memory')
    const embedder = node('Query Embedder'), retriever = flow.nodes.find((n) => n.data.nodeType === 'retriever')!

    expect(handleTo(question.id, 'payload', rewriter.id, 'prompt')).toBe(true)
    expect(handleTo(memory.id, 'history', rewriter.id, 'memory')).toBe(true)
    expect(handleTo(rewriter.id, 'response', embedder.id, 'text')).toBe(true)
    expect(handleTo(rewriter.id, 'response', retriever.id, 'query')).toBe(true)
    expect(flow.edges.some((e) => e.source === question.id && (e.target === embedder.id || e.target === retriever.id))).toBe(false)
  })

  it('retrieves from a vector store and answers only from retrieved context', () => {
    const retriever = flow.nodes.find((n) => n.data.nodeType === 'retriever')!
    const store = flow.nodes.find((n) => n.data.nodeType === 'vectorDB')!
    expect(handleTo(store.id, 'store', retriever.id, 'store')).toBe(true)
    expect(String(node('Answer LLM').data.config.systemPrompt)).toMatch(/only the retrieved context/)
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
