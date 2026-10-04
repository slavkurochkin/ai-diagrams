import { describe, expect, it } from 'vitest'
import { computeLatency, DEFAULT_VOICE_TIMINGS, formatMs, LATENCY_PRESETS, parseTimings } from './latency'

const preset = (name: string) => LATENCY_PRESETS.find((p) => p.name === name)!.timings

describe('computeLatency', () => {
  it('sums the cascade stages into time to first audio, in order', () => {
    const r = computeLatency(DEFAULT_VOICE_TIMINGS)
    expect(r.segments.map((s) => s.id)).toEqual(['networkIn', 'endOfTurn', 'sttFinal', 'llmTtft', 'generation', 'ttsTtfb', 'networkOut'])
    // 60 + 300 + 100 + 350 + (12 tokens at 80 tok/s = 150) + 120 + 60
    expect(r.headlineMs).toBe(1140)
    expect(r.headlineLabel).toBe('Time to first audio')
    expect(r.overBudget).toBe(true) // the default teaches that a typical cascade misses 800 ms
    expect(r.biggest?.id).toBe('llmTtft')
    // Segments are contiguous.
    r.segments.forEach((s, i) => i > 0 && expect(s.startMs).toBe(r.segments[i - 1].startMs + r.segments[i - 1].durationMs))
  })

  it('without streaming TTS the whole reply is generated before speech starts', () => {
    const streaming = computeLatency(preset('Typical cascade'))
    const batch = computeLatency(preset('No streaming TTS'))
    // 60 tokens instead of 12 at 80 tok/s: +600 ms
    expect(batch.headlineMs - streaming.headlineMs).toBe(600)
  })

  it('realtime mode removes the STT, LLM and TTS hand-offs', () => {
    const r = computeLatency(preset('Realtime model'))
    expect(r.segments.map((s) => s.id)).toEqual(['networkIn', 'endOfTurn', 'realtimeTtfb', 'networkOut'])
    expect(r.headlineMs).toBe(60 + 300 + 300 + 60)
  })

  it('text mode reports TTFT as the headline and streams the rest after it', () => {
    const r = computeLatency(preset('Streaming chat'))
    expect(r.headlineLabel).toBe('Time to first token')
    expect(r.headlineMs).toBe(450)
    expect(r.totalMs).toBe(450 + 3750) // 300 tokens at 80 tok/s
    expect(r.segments.find((s) => s.id === 'stream')?.critical).toBe(false)
  })

  it('each preset demonstrates what its name says', () => {
    expect(computeLatency(preset('Slow LLM (reasoning on)')).biggest?.id).toBe('llmTtft')
    expect(computeLatency(preset('Cautious end-of-turn')).biggest?.id).toBe('endOfTurn')
    expect(computeLatency(preset('Realtime model')).overBudget).toBe(false)
    expect(computeLatency(preset('Reasoning model')).overBudget).toBe(true)
    expect(computeLatency(preset('Long answer, slow model')).totalMs).toBe(450 + 30000)
  })
})

describe('parseTimings', () => {
  it('reads stored JSON and falls back field by field', () => {
    expect(parseTimings('{"llmTtftMs": 900, "mode": "bogus", "budgetMs": "x"}', DEFAULT_VOICE_TIMINGS)).toEqual({
      ...DEFAULT_VOICE_TIMINGS,
      llmTtftMs: 900,
    })
    expect(parseTimings('not json', DEFAULT_VOICE_TIMINGS)).toBe(DEFAULT_VOICE_TIMINGS)
    expect(parseTimings(undefined, DEFAULT_VOICE_TIMINGS)).toBe(DEFAULT_VOICE_TIMINGS)
  })

  it('formats milliseconds', () => {
    expect(formatMs(140)).toBe('140 ms')
    expect(formatMs(1140)).toBe('1.14 s')
  })
})
