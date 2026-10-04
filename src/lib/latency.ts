// ── Latency waterfalls ───────────────────────────────────────────────────────
// Pure model of where response latency comes from, shared by the latency
// visualizer, the latency eval nodes' playback overlays, and the latency template.
//
// Voice: time to first audio (TTFA) is the user-perceived TTFB of the whole pipeline —
// from the moment the user stops speaking until the first agent audio reaches them.
// It is a chain of per-stage delays; streaming TTS lets speech start after the first
// sentence instead of the whole reply, which is why it moves TTFA more than any model swap.

export type LatencyMode = 'cascade' | 'realtime' | 'text'

export interface LatencyTimings {
  mode: LatencyMode
  /** Caller ↔ server network / telephony, each direction (ms). Voice only. */
  networkMs: number
  /** Silence or semantic end-of-turn wait after the user stops (ms). Voice only. */
  endOfTurnMs: number
  /** Final transcript arriving after end of turn (ms). Cascade only. */
  sttFinalMs: number
  /** LLM time to first token (ms) — the LLM's TTFB. Cascade and text. */
  llmTtftMs: number
  /** LLM generation speed (tokens/s). Cascade and text. */
  tokensPerSec: number
  /** Tokens before TTS can start: the first sentence when streaming. Cascade only. */
  firstChunkTokens: number
  /** Tokens in the full reply. */
  responseTokens: number
  /** TTS starts on the first sentence (true) or waits for the full reply (false). Cascade only. */
  ttsStreaming: boolean
  /** TTS time to first audio byte (ms). Cascade only. */
  ttsTtfbMs: number
  /** Speech-to-speech model: time to first audio byte after end of turn (ms). Realtime only. */
  realtimeTtfbMs: number
  /** Target for the headline number (TTFA for voice, TTFT for text), ms. */
  budgetMs: number
}

export type StageId = 'networkIn' | 'endOfTurn' | 'sttFinal' | 'llmTtft' | 'generation' | 'ttsTtfb' | 'realtimeTtfb' | 'networkOut' | 'stream'

/** Per-stage TTFB budgets (ms); stages over theirs are flagged. */
export type LatencyStageBudgets = Partial<Record<StageId, number>>

export interface LatencySegment {
  id: StageId
  label: string
  startMs: number
  durationMs: number
  /** Counts toward the headline number (TTFA / TTFT); `stream` segments come after it. */
  critical: boolean
}

export interface LatencyResult {
  segments: LatencySegment[]
  /** Voice: time to first audio. Text: time to first token. */
  headlineMs: number
  headlineLabel: string
  /** End of the last segment. Text: until the last token; voice: equals the headline (playback length is not modelled). */
  totalMs: number
  overBudget: boolean
  /** Largest critical-path stage. */
  biggest: LatencySegment | null
}

export const STAGE_LABEL: Record<StageId, string> = {
  networkIn: 'Network in',
  endOfTurn: 'End-of-turn wait',
  sttFinal: 'STT final transcript',
  llmTtft: 'LLM time to first token',
  generation: 'LLM generation before speech',
  ttsTtfb: 'TTS time to first byte',
  realtimeTtfb: 'Realtime model first audio',
  networkOut: 'Network out',
  stream: 'Streaming the rest',
}

const msFor = (tokens: number, tokensPerSec: number) =>
  tokensPerSec > 0 ? Math.round((Math.max(0, tokens) / tokensPerSec) * 1000) : 0

export function computeLatency(t: LatencyTimings): LatencyResult {
  const steps: { id: StageId; ms: number; critical?: boolean }[] = []
  if (t.mode === 'text') {
    steps.push({ id: 'llmTtft', ms: t.llmTtftMs })
    steps.push({ id: 'stream', ms: msFor(t.responseTokens, t.tokensPerSec), critical: false })
  } else if (t.mode === 'realtime') {
    steps.push({ id: 'networkIn', ms: t.networkMs }, { id: 'endOfTurn', ms: t.endOfTurnMs })
    steps.push({ id: 'realtimeTtfb', ms: t.realtimeTtfbMs }, { id: 'networkOut', ms: t.networkMs })
  } else {
    const beforeSpeech = t.ttsStreaming ? Math.min(t.firstChunkTokens, t.responseTokens) : t.responseTokens
    steps.push({ id: 'networkIn', ms: t.networkMs }, { id: 'endOfTurn', ms: t.endOfTurnMs })
    steps.push({ id: 'sttFinal', ms: t.sttFinalMs }, { id: 'llmTtft', ms: t.llmTtftMs })
    steps.push({ id: 'generation', ms: msFor(beforeSpeech, t.tokensPerSec) })
    steps.push({ id: 'ttsTtfb', ms: t.ttsTtfbMs }, { id: 'networkOut', ms: t.networkMs })
  }

  let clock = 0
  const segments: LatencySegment[] = steps.map((s) => {
    const seg = { id: s.id, label: STAGE_LABEL[s.id], startMs: clock, durationMs: Math.max(0, s.ms), critical: s.critical !== false }
    clock += seg.durationMs
    return seg
  })
  const critical = segments.filter((s) => s.critical)
  const headlineMs = critical.reduce((sum, s) => sum + s.durationMs, 0)
  const biggest = critical.reduce<LatencySegment | null>((b, s) => (!b || s.durationMs > b.durationMs ? s : b), null)

  return {
    segments,
    headlineMs,
    headlineLabel: t.mode === 'text' ? 'Time to first token' : 'Time to first audio',
    totalMs: clock,
    overBudget: headlineMs > t.budgetMs,
    biggest: biggest && biggest.durationMs > 0 ? biggest : null,
  }
}

// ── Presets (illustrative orders of magnitude, not vendor benchmarks) ─────────

const CASCADE: LatencyTimings = {
  mode: 'cascade',
  networkMs: 60,
  endOfTurnMs: 300,
  sttFinalMs: 100,
  llmTtftMs: 350,
  tokensPerSec: 80,
  firstChunkTokens: 12,
  responseTokens: 60,
  ttsStreaming: true,
  ttsTtfbMs: 120,
  realtimeTtfbMs: 300,
  budgetMs: 800,
}

const TEXT: LatencyTimings = { ...CASCADE, mode: 'text', llmTtftMs: 450, responseTokens: 300, budgetMs: 800 }

export type PresetKind = 'voice' | 'text'

export const LATENCY_PRESETS: { name: string; kind: PresetKind; lesson: string; timings: LatencyTimings }[] = [
  {
    name: 'Typical cascade',
    kind: 'voice',
    lesson: 'Every stage adds up — a reasonable cascade still misses an 800 ms target. LLM time to first token and the end-of-turn wait are the biggest pieces.',
    timings: CASCADE,
  },
  {
    name: 'No streaming TTS',
    kind: 'voice',
    lesson: 'TTS waits for the whole reply, so the full generation time lands on the critical path.',
    timings: { ...CASCADE, ttsStreaming: false },
  },
  {
    name: 'Slow LLM (reasoning on)',
    kind: 'voice',
    lesson: 'Thinking happens before the first token, so a reasoning-heavy setting dominates time to first audio.',
    timings: { ...CASCADE, llmTtftMs: 1800 },
  },
  {
    name: 'Cautious end-of-turn',
    kind: 'voice',
    lesson: 'A long silence threshold avoids cutting people off but adds its full length to every turn.',
    timings: { ...CASCADE, endOfTurnMs: 900 },
  },
  {
    name: 'Realtime model',
    kind: 'voice',
    lesson: 'One speech-to-speech model removes the STT and TTS hand-offs; only turn detection and the model remain.',
    timings: { ...CASCADE, mode: 'realtime' },
  },
  {
    name: 'Streaming chat',
    kind: 'text',
    lesson: 'For streamed text, TTFT is what users feel; the rest arrives while they read.',
    timings: TEXT,
  },
  {
    name: 'Reasoning model',
    kind: 'text',
    lesson: 'Thinking happens before the first token: great answers, but TTFT blows past a chat budget. Lower the effort or show progress.',
    timings: { ...TEXT, llmTtftMs: 4000 },
  },
  {
    name: 'Long answer, slow model',
    kind: 'text',
    lesson: 'TTFT is fine, but a long reply at low tokens/sec takes ages to finish — it matters when the output is parsed as a whole.',
    timings: { ...TEXT, tokensPerSec: 30, responseTokens: 900 },
  },
]

export const DEFAULT_VOICE_TIMINGS: LatencyTimings = CASCADE
export const DEFAULT_TEXT_TIMINGS: LatencyTimings = TEXT

/** Parse timings stored on a node (JSON); missing or invalid fields fall back to `fallback`. */
export function parseTimings(raw: unknown, fallback: LatencyTimings): LatencyTimings {
  if (typeof raw !== 'string' || !raw.trim()) return fallback
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>
    const out: Record<string, unknown> = { ...fallback }
    for (const key of Object.keys(fallback) as (keyof LatencyTimings)[]) {
      const v = obj[key]
      if (typeof v === typeof fallback[key]) out[key] = v
    }
    if (!['cascade', 'realtime', 'text'].includes(out.mode as string)) out.mode = fallback.mode
    return out as unknown as LatencyTimings
  } catch {
    return fallback
  }
}

export function formatMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${Math.round(ms)} ms`
}
