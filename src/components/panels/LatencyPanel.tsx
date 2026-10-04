import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save } from 'lucide-react'
import LatencyWaterfall from '../latency/LatencyWaterfall'
import {
  computeLatency,
  formatMs,
  LATENCY_PRESETS,
  type LatencyStageBudgets,
  type LatencyTimings,
  type PresetKind,
} from '../../lib/latency'

type NumericKey = {
  [K in keyof LatencyTimings]: LatencyTimings[K] extends number ? K : never
}[keyof LatencyTimings]

interface SliderSpec {
  key: NumericKey
  label: string
  min: number
  max: number
  step: number
  unit: string
  hint: string
}

const SLIDERS: Record<LatencyTimings['mode'], SliderSpec[]> = {
  cascade: [
    { key: 'endOfTurnMs', label: 'End-of-turn wait', min: 0, max: 1500, step: 25, unit: 'ms', hint: 'Silence / semantic wait before the agent decides the user is done' },
    { key: 'sttFinalMs', label: 'STT final transcript', min: 0, max: 800, step: 10, unit: 'ms', hint: 'Final transcript arriving after end of turn (streaming STT keeps this small)' },
    { key: 'llmTtftMs', label: 'LLM time to first token', min: 50, max: 5000, step: 25, unit: 'ms', hint: "The LLM's TTFB — includes any thinking before the first token" },
    { key: 'tokensPerSec', label: 'LLM speed', min: 10, max: 300, step: 5, unit: 'tok/s', hint: 'Generation speed after the first token' },
    { key: 'firstChunkTokens', label: 'First sentence', min: 1, max: 60, step: 1, unit: 'tokens', hint: 'What streaming TTS waits for before speaking' },
    { key: 'responseTokens', label: 'Full reply', min: 5, max: 1000, step: 5, unit: 'tokens', hint: 'What non-streaming TTS waits for' },
    { key: 'ttsTtfbMs', label: 'TTS time to first byte', min: 20, max: 800, step: 10, unit: 'ms', hint: 'First audio bytes back from the voice model' },
    { key: 'networkMs', label: 'Network, each way', min: 0, max: 300, step: 5, unit: 'ms', hint: 'Telephony / WebRTC hop to and from the server' },
  ],
  realtime: [
    { key: 'endOfTurnMs', label: 'End-of-turn wait', min: 0, max: 1500, step: 25, unit: 'ms', hint: "Built-in turn detection in the realtime model" },
    { key: 'realtimeTtfbMs', label: 'Model first audio', min: 50, max: 2000, step: 25, unit: 'ms', hint: 'Speech-to-speech model: end of turn to first audio byte' },
    { key: 'networkMs', label: 'Network, each way', min: 0, max: 300, step: 5, unit: 'ms', hint: 'Telephony / WebRTC hop to and from the server' },
  ],
  text: [
    { key: 'llmTtftMs', label: 'Time to first token', min: 50, max: 8000, step: 25, unit: 'ms', hint: "The LLM's TTFB — includes any thinking before the first token" },
    { key: 'tokensPerSec', label: 'Speed', min: 5, max: 300, step: 5, unit: 'tok/s', hint: 'Generation speed after the first token' },
    { key: 'responseTokens', label: 'Reply length', min: 10, max: 2000, step: 10, unit: 'tokens', hint: 'Longer replies take longer to finish, not to start' },
  ],
}

interface LatencyPanelProps {
  open: boolean
  onClose: () => void
  kind: PresetKind
  initial: LatencyTimings
  stageBudgets?: LatencyStageBudgets
  /** When set, shows "Save to node" so the example plays in the canvas overlay. */
  onSave?: (timings: LatencyTimings) => void
}

export default function LatencyPanel({ open, onClose, kind, initial, stageBudgets = {}, onSave }: LatencyPanelProps) {
  const [t, setT] = useState<LatencyTimings>(initial)
  const [lesson, setLesson] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Re-seed from the node each time the panel opens.
  useEffect(() => {
    if (!open) return
    setT(initial)
    setLesson(null)
    setSaved(false)
  }, [open])

  const update = (patch: Partial<LatencyTimings>) => {
    setT((prev) => ({ ...prev, ...patch }))
    setSaved(false)
  }

  const result = useMemo(() => computeLatency(t), [t])
  // What-if: the same turn with streaming TTS flipped (cascade only).
  const flipped = useMemo(() => (t.mode === 'cascade' ? computeLatency({ ...t, ttsStreaming: !t.ttsStreaming }) : null), [t])
  const presets = LATENCY_PRESETS.filter((p) => p.kind === kind)

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="latency-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            key="latency-panel"
            initial={{ opacity: 0, scale: 0.97, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-3xl max-h-[90vh] flex flex-col bg-gray-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">

              {/* Header */}
              <div className="flex items-start justify-between px-5 py-4 border-b border-white/8 shrink-0">
                <div>
                  <h2 className="text-[14px] font-semibold text-white">
                    {kind === 'text' ? 'Response Latency Visualizer' : 'Voice Latency Visualizer'}
                  </h2>
                  <p className="text-[11px] text-white/40 mt-0.5">
                    {kind === 'text'
                      ? 'See how time to first token and generation speed shape what users wait for'
                      : 'See how each stage’s time to first byte stacks into time to first audio'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0 p-5 flex flex-col gap-5">

                {/* Presets */}
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-medium text-white/60 uppercase tracking-wider">Examples</span>
                  <div className="flex flex-wrap gap-2">
                    {presets.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => { setT({ ...p.timings, budgetMs: t.budgetMs }); setLesson(p.lesson); setSaved(false) }}
                        className="px-2.5 py-1 rounded-lg text-[11px] border border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                  {lesson && <p className="text-[11px] text-violet-200/80 leading-relaxed">{lesson}</p>}
                </div>

                {/* Headline */}
                <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-white/40">{result.headlineLabel}</div>
                    <div className={`text-[28px] font-bold tabular-nums leading-tight ${result.overBudget ? 'text-rose-300' : 'text-emerald-300'}`}>
                      {formatMs(result.headlineMs)}
                    </div>
                  </div>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-white/40">Budget (ms)</span>
                    <input
                      type="number"
                      min={50}
                      step={50}
                      value={t.budgetMs}
                      onChange={(e) => update({ budgetMs: Math.max(0, Number(e.target.value) || 0) })}
                      className="w-24 px-2 py-1 rounded-md text-[12px] bg-white/5 border border-white/10 text-white/85 focus:outline-none focus:border-white/30"
                    />
                  </label>
                  {t.mode === 'text' && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-white/40">Last token</div>
                      <div className="text-[18px] font-semibold tabular-nums text-white/70 leading-tight">{formatMs(result.totalMs)}</div>
                    </div>
                  )}
                  {kind === 'voice' && (
                    <div className="flex rounded-md border border-white/10 overflow-hidden ml-auto">
                      {(['cascade', 'realtime'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => update({ mode: m })}
                          className={`px-3 py-1.5 text-[11px] transition-colors ${t.mode === m ? 'bg-white/15 text-white' : 'text-white/50 hover:bg-white/5'}`}
                        >
                          {m === 'cascade' ? 'Cascade (STT → LLM → TTS)' : 'Realtime model'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Waterfall */}
                <LatencyWaterfall result={result} budgetMs={t.budgetMs} stageBudgets={stageBudgets} />

                {/* Readout */}
                <div className="flex flex-col gap-1 text-[11px] text-white/55 leading-relaxed">
                  {result.biggest && (
                    <p>
                      Biggest piece: <span className="text-white/85">{result.biggest.label}</span> at {formatMs(result.biggest.durationMs)}
                      {' '}({Math.round((result.biggest.durationMs / Math.max(1, result.headlineMs)) * 100)}% of {result.headlineLabel.toLowerCase()}).
                    </p>
                  )}
                  {flipped && (
                    <p>
                      {t.ttsStreaming
                        ? <>Streaming TTS is saving <span className="text-emerald-300">{formatMs(flipped.headlineMs - result.headlineMs)}</span>: speech starts after the first sentence, not the whole reply.</>
                        : <>Turning on streaming TTS would save <span className="text-emerald-300">{formatMs(result.headlineMs - flipped.headlineMs)}</span>.</>}
                    </p>
                  )}
                  {t.mode === 'text' && (
                    <p>
                      With streaming, users start reading after {formatMs(result.headlineMs)}; without it they wait the full {formatMs(result.totalMs)}.
                    </p>
                  )}
                </div>

                {/* Controls */}
                <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                  {SLIDERS[t.mode].map((s) => (
                    <label key={s.key} className="flex flex-col gap-1" title={s.hint}>
                      <span className="flex items-baseline justify-between text-[11px]">
                        <span className="text-white/60">{s.label}</span>
                        <span className="tabular-nums text-white/80">{t[s.key]} {s.unit}</span>
                      </span>
                      <input
                        type="range"
                        min={s.min}
                        max={s.max}
                        step={s.step}
                        value={t[s.key]}
                        onChange={(e) => update({ [s.key]: Number(e.target.value) } as Partial<LatencyTimings>)}
                        className="w-full accent-violet-400"
                      />
                    </label>
                  ))}
                  {t.mode === 'cascade' && (
                    <label className="flex items-center gap-2 text-[11px] text-white/60">
                      <input type="checkbox" checked={t.ttsStreaming} onChange={(e) => update({ ttsStreaming: e.target.checked })} className="accent-violet-400" />
                      Streaming TTS (speak from the first sentence)
                    </label>
                  )}
                </div>
                <p className="text-[10px] text-white/30">Example values are illustrative orders of magnitude, not vendor benchmarks — measure your own pipeline.</p>
              </div>

              {/* Footer */}
              {onSave && (
                <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-white/8 shrink-0">
                  {saved && <span className="text-[11px] text-emerald-300">Saved — plays on the node during playback</span>}
                  <button
                    type="button"
                    onClick={() => { onSave(t); setSaved(true) }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-violet-900/40 border border-violet-700/40 text-violet-200 hover:bg-violet-800/50 hover:text-white transition-colors"
                  >
                    <Save size={13} />
                    Save to node
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
