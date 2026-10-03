import { describe, expect, it } from 'vitest'
import { checkConnection, portsCompatible } from './connectionRules'

describe('portsCompatible', () => {
  it('lets any connect to everything and otherwise requires an exact match', () => {
    expect(portsCompatible('any', 'structured')).toBe(true)
    expect(portsCompatible('text', 'any')).toBe(true)
    expect(portsCompatible('text', 'text')).toBe(true)
    expect(portsCompatible('text', 'structured')).toBe(false)
    expect(portsCompatible('embedding', 'text')).toBe(false)
  })
})

describe('checkConnection', () => {
  const llm = { nodeType: 'llm' }

  it('accepts compatible ports', () => {
    const r = checkConnection({ nodeType: 'trigger' }, 'payload', llm, 'prompt')
    expect(r.ok).toBe(true)
  })

  it('rejects incompatible port types with a readable error', () => {
    const r = checkConnection(llm, 'response', { nodeType: 'thresholdGate' }, 'score')
    expect(r).toEqual({ ok: false, error: 'incompatible ports: llm.response (text) → thresholdGate.score (structured)' })
  })

  it('rejects missing ports and unknown node types', () => {
    expect(checkConnection(llm, 'nope', llm, 'prompt')).toMatchObject({ ok: false, error: 'llm has no output "nope"' })
    expect(checkConnection(llm, 'response', { nodeType: 'dataLoader' }, 'x')).toMatchObject({ ok: false })
    expect(checkConnection({ nodeType: 'mystery' }, 'a', llm, 'prompt')).toMatchObject({ ok: false })
  })

  it('resolves config-driven ports from the node config', () => {
    expect(checkConnection({ nodeType: 'router' }, 'routeC', llm, 'prompt').ok).toBe(false)
    expect(checkConnection({ nodeType: 'router', config: { routeCount: 3 } }, 'routeC', llm, 'prompt').ok).toBe(true)
  })
})
