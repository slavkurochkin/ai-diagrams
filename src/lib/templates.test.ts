import { describe, expect, it } from 'vitest'
import { FLOW_TEMPLATES } from './templates'
import { parseFlowYAML, type ParsedFlow } from './yamlFlow'
import { getNodeDefinition } from './nodeDefinitions'

const ENTRY_TYPES = new Set(['trigger', 'dataLoader'])

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
    expect(flow.nodes[0].data.config.model).toBe('gpt-5')
  })
})
