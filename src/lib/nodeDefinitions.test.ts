import { describe, expect, it } from 'vitest'
import { nodeTypes } from '../components/nodes'
import {
  buildDefaultConfig,
  getAllNodeDefinitions,
  getNodeDefinition,
  isConfigFieldVisible,
  resolveNodePorts,
  upgradeLegacyConfig,
} from './nodeDefinitions'

const ports = (type: string, config: Record<string, string | number | boolean> = {}) => {
  const def = getNodeDefinition(type)
  if (!def) throw new Error(`no definition for ${type}`)
  return resolveNodePorts(def, config)
}
const ids = (list: { id: string }[]) => list.map((p) => p.id)

describe('node registry', () => {
  const defs = getAllNodeDefinitions()

  it('has unique types, each with a renderer and an accent color', () => {
    expect(new Set(defs.map((d) => d.type)).size).toBe(defs.length)
    for (const d of defs) {
      expect(nodeTypes[d.type], `nodeTypes is missing "${d.type}"`).toBeDefined()
      expect(d.accentColor, `${d.type} has no accent color`).toMatch(/^#/)
    }
    for (const type of Object.keys(nodeTypes)) {
      expect(getNodeDefinition(type), `nodeTypes has "${type}" but no definition`).toBeDefined()
    }
  })

  it('has valid config fields', () => {
    for (const d of defs) {
      const keys = new Set(d.configFields.map((f) => f.key))
      expect(keys.size, `${d.type} has duplicate config keys`).toBe(d.configFields.length)
      for (const f of d.configFields) {
        if (f.type === 'select') {
          const values = f.options?.map((o) => o.value) ?? []
          expect(values, `${d.type}.${f.key} default is not an option`).toContain(f.defaultValue)
        }
        if (f.visibleWhen) {
          expect(keys.has(f.visibleWhen.key), `${d.type}.${f.key} visibleWhen references a missing field`).toBe(true)
        }
      }
    }
  })

  it('has unique port ids per node at default config', () => {
    for (const d of defs) {
      const { inputs, outputs } = resolveNodePorts(d, buildDefaultConfig(d.type))
      expect(new Set(ids(inputs)).size, `${d.type} duplicate input ids`).toBe(inputs.length)
      expect(new Set(ids(outputs)).size, `${d.type} duplicate output ids`).toBe(outputs.length)
    }
  })

  it('exposes the same default ports to the AI catalog as on the canvas', () => {
    for (const d of defs) {
      const resolved = resolveNodePorts(d, buildDefaultConfig(d.type))
      expect(ids(resolved.inputs), `${d.type} inputs`).toEqual(ids(d.inputs))
      expect(ids(resolved.outputs), `${d.type} outputs`).toEqual(ids(d.outputs))
    }
  })
})

describe('observability nodes', () => {
  it('tracing has no ports so it never needs wiring', () => {
    expect(ports('tracing')).toEqual({ inputs: [], outputs: [] })
  })
})

describe('config-driven ports', () => {
  it('router has one output per route plus default', () => {
    expect(ids(ports('router').outputs)).toEqual(['routeA', 'routeB', 'default'])
    const four = ports('router', { routeCount: 4, routeLabels: 'Billing, Tech' }).outputs
    expect(ids(four)).toEqual(['routeA', 'routeB', 'routeC', 'routeD', 'default'])
    expect(four.map((p) => p.label)).toEqual(['Billing', 'Tech', 'Route C', 'Route D', 'Default'])
  })

  it('clamps out-of-range and junk counts to 2–8', () => {
    expect(ports('router', { routeCount: 20 }).outputs).toHaveLength(9)
    expect(ports('router', { routeCount: 0 }).outputs).toHaveLength(3)
    expect(ports('aggregator', { inputCount: 'abc' }).inputs).toHaveLength(2)
  })

  it('aggregator has one input per branch', () => {
    expect(ids(ports('aggregator', { inputCount: 3 }).inputs)).toEqual(['inputA', 'inputB', 'inputC'])
  })

  it('classifier adds one deduplicated output per class only when branching', () => {
    expect(ids(ports('classifier', { classes: 'a, b' }).outputs)).toEqual(['label', 'confidence'])
    const branching = ports('classifier', { branchPerClass: true, classes: 'Billing issue, Tech, tech, ,' })
    expect(ids(branching.outputs)).toEqual(['class_billing_issue', 'class_tech', 'label', 'confidence'])
  })
})

describe('upgradeLegacyConfig', () => {
  it('maps retired model ids to current options', () => {
    expect(upgradeLegacyConfig('llm', { model: 'gpt-4o', temperature: 0.2 })).toEqual({ model: 'gpt-5', temperature: 0.2 })
    expect(upgradeLegacyConfig('llmJudge', { judgeModel: 'claude-3-5-sonnet-20241022' }).judgeModel).toBe('claude-sonnet-5-5')
    expect(upgradeLegacyConfig('embedding', { model: 'text-embedding-ada-002' }).model).toBe('text-embedding-3-small')
    expect(upgradeLegacyConfig('webSearch', { engine: 'bing' }).engine).toBe('brave')
  })

  it('leaves current and unknown values alone and returns the same object when unchanged', () => {
    const current = { model: 'claude-opus-5-5' }
    expect(upgradeLegacyConfig('llm', current)).toBe(current)
    expect(upgradeLegacyConfig('llm', { model: 'my-finetune' }).model).toBe('my-finetune')
  })
})

describe('isConfigFieldVisible', () => {
  const llm = getNodeDefinition('llm')!
  const field = (key: string) => llm.configFields.find((f) => f.key === key)!

  it('shows temperature only for models that accept it, and effort only for models that have it', () => {
    expect(isConfigFieldVisible(field('temperature'), { model: 'claude-haiku-4-5' })).toBe(true)
    expect(isConfigFieldVisible(field('temperature'), { model: 'claude-opus-5-5' })).toBe(false)
    expect(isConfigFieldVisible(field('effort'), { model: 'claude-opus-5-5' })).toBe(true)
    expect(isConfigFieldVisible(field('effort'), { model: 'llama-4-maverick' })).toBe(false)
  })

  it('shows checkpointing and retention only for durable state backends', () => {
    const state = getNodeDefinition('state')!
    const checkpointing = state.configFields.find((f) => f.key === 'checkpointing')!
    expect(isConfigFieldVisible(checkpointing, { backend: 'memory' })).toBe(false)
    expect(isConfigFieldVisible(checkpointing, { backend: 'postgres' })).toBe(true)
  })

  it('handles single-value conditions', () => {
    expect(isConfigFieldVisible(field('outputSchema'), { responseFormat: 'json-schema' })).toBe(true)
    expect(isConfigFieldVisible(field('outputSchema'), { responseFormat: 'text' })).toBe(false)
    expect(isConfigFieldVisible(field('model'), {})).toBe(true)
  })
})
