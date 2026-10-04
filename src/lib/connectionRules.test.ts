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

  it('keeps audio separate from text but lets any carry it', () => {
    expect(portsCompatible('audio', 'audio')).toBe(true)
    expect(portsCompatible('audio', 'text')).toBe(false)
    expect(portsCompatible('text', 'audio')).toBe(false)
    expect(portsCompatible('audio', 'any')).toBe(true)
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

  it("switches a trigger's output to audio for phone calls and voice sessions", () => {
    const phone = { nodeType: 'trigger', config: { triggerType: 'phone-call' } }
    expect(checkConnection(phone, 'audio', { nodeType: 'speechToText' }, 'audio').ok).toBe(true)
    expect(checkConnection(phone, 'audio', { nodeType: 'llm' }, 'prompt').ok).toBe(false)
    expect(checkConnection({ nodeType: 'trigger' }, 'payload', { nodeType: 'speechToText' }, 'audio')).toEqual({
      ok: false,
      error: 'incompatible ports: trigger.payload (text) → speechToText.audio (audio)',
    })
  })

  it('resolves config-driven ports from the node config', () => {
    expect(checkConnection({ nodeType: 'router' }, 'routeC', llm, 'prompt').ok).toBe(false)
    expect(checkConnection({ nodeType: 'router', config: { routeCount: 3 } }, 'routeC', llm, 'prompt').ok).toBe(true)
  })
})
