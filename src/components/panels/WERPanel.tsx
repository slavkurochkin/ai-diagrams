import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Ban, Save } from 'lucide-react'
import WerAlignment, { OP_STYLE } from '../wer/WerAlignment'
import { computeWer, formatRate, parseEntities, type Normalization } from '../../lib/wer'

// ── Preset examples — each one teaches a single point ─────────────────────────

const PRESETS: { name: string; lesson: string; reference: string; transcript: string; entities: string }[] = [
  {
    name: 'Wrong time',
    lesson: 'Two small edits, but one of them books the wrong appointment — WER treats both the same; entity error rate does not.',
    reference: 'Book me for three thirty on Tuesday',
    transcript: 'book me for three thirteen tuesday',
    entities: 'three thirty, tuesday',
  },
  {
    name: 'Formatting only',
    lesson: 'Same words, different formatting. Switch normalisation to "none" and every formatting difference becomes an error.',
    reference: 'Your total is 42 dollars, due at 3:30.',
    transcript: 'your total is forty two dollars due at three thirty',
    entities: '42, 3:30',
  },
  {
    name: 'Filler words',
    lesson: 'Standard normalisation drops um / uh, so a verbatim transcript is not punished for hesitations.',
    reference: 'I want to cancel my order',
    transcript: 'um I want to uh cancel my order',
    entities: 'cancel',
  },
  {
    name: 'Over 100%',
    lesson: 'WER divides by the reference length, so a transcript full of extra words can score above 100%.',
    reference: 'yes',
    transcript: 'yes yes that is right yes',
    entities: '',
  },
]

const NORMALIZATIONS: { value: Normalization; label: string; hint: string }[] = [
  { value: 'standard', label: 'Standard', hint: 'case, punctuation, numbers → words, fillers removed' },
  { value: 'basic', label: 'Basic', hint: 'case and punctuation only' },
  { value: 'none', label: 'None', hint: 'exact text — every formatting difference counts' },
]

export interface WERExample {
  reference: string
  transcript: string
  entities: string
  normalization: Normalization
}

interface WERPanelProps {
  open: boolean
  onClose: () => void
  initial: WERExample
  /** When set, shows "Save to node" so the example plays in the canvas overlay. */
  onSave?: (example: WERExample) => void
}

function Stat({ label, value, detail, color }: { label: string; value: string; detail: string; color: string }) {
  return (
    <div className="flex-1 min-w-[140px] rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-white/40">{label}</div>
      <div className="text-[22px] font-bold tabular-nums leading-tight" style={{ color }}>{value}</div>
      <div className="text-[10px] text-white/40 font-mono mt-0.5">{detail}</div>
    </div>
  )
}

export default function WERPanel({ open, onClose, initial, onSave }: WERPanelProps) {
  const [reference, setReference] = useState(initial.reference)
  const [transcript, setTranscript] = useState(initial.transcript)
  const [entities, setEntities] = useState(initial.entities)
  const [normalization, setNormalization] = useState<Normalization>(initial.normalization)
  const [lesson, setLesson] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Re-seed from the node each time the panel opens.
  useEffect(() => {
    if (!open) return
    setReference(initial.reference)
    setTranscript(initial.transcript)
    setEntities(initial.entities)
    setNormalization(initial.normalization)
    setLesson(null)
    setSaved(false)
  }, [open])

  const result = useMemo(
    () => computeWer(reference, transcript, { normalization, entities: parseEntities(entities) }),
    [reference, transcript, entities, normalization],
  )
  const errors = result.substitutions + result.deletions + result.insertions

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    setReference(p.reference)
    setTranscript(p.transcript)
    setEntities(p.entities)
    setLesson(p.lesson)
    setSaved(false)
  }

  const input =
    'w-full px-2.5 py-1.5 rounded-md text-[12px] bg-white/5 border border-white/10 text-white/85 placeholder:text-white/25 focus:outline-none focus:border-white/30'

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="wer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            key="wer-panel"
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
                  <h2 className="text-[14px] font-semibold text-white">Word Error Rate Visualizer</h2>
                  <p className="text-[11px] text-white/40 mt-0.5">
                    Edit the reference and the transcript to see how they align and how each edit moves WER
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
                    {PRESETS.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => applyPreset(p)}
                        className="px-2.5 py-1 rounded-lg text-[11px] border border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                  {lesson && <p className="text-[11px] text-amber-200/80 leading-relaxed">{lesson}</p>}
                </div>

                {/* Inputs */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-white/50">Reference (what was said)</span>
                    <textarea rows={2} value={reference} onChange={(e) => { setReference(e.target.value); setSaved(false) }} className={input} />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-white/50">Transcript (what was heard)</span>
                    <textarea rows={2} value={transcript} onChange={(e) => { setTranscript(e.target.value); setSaved(false) }} className={input} />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-white/50">Entities to track</span>
                    <input value={entities} onChange={(e) => { setEntities(e.target.value); setSaved(false) }} placeholder="three thirty, tuesday" className={input} />
                  </label>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-white/50">Normalisation</span>
                    <div className="flex rounded-md border border-white/10 overflow-hidden">
                      {NORMALIZATIONS.map((n) => (
                        <button
                          key={n.value}
                          type="button"
                          title={n.hint}
                          onClick={() => { setNormalization(n.value); setSaved(false) }}
                          className={`flex-1 px-2 py-1.5 text-[11px] transition-colors ${normalization === n.value ? 'bg-white/15 text-white' : 'text-white/50 hover:bg-white/5'}`}
                        >
                          {n.label}
                        </button>
                      ))}
                    </div>
                    <span className="text-[10px] text-white/35">{NORMALIZATIONS.find((n) => n.value === normalization)?.hint}</span>
                  </div>
                </div>

                {/* What gets compared */}
                {normalization !== 'none' && (
                  <div className="flex flex-col gap-1 text-[11px] font-mono">
                    <span className="text-[10px] font-sans uppercase tracking-wider text-white/40">After normalisation</span>
                    <span className="text-white/60"><span className="text-white/30">ref </span>{result.refTokens.join(' ') || '—'}</span>
                    <span className="text-white/60"><span className="text-white/30">hyp </span>{result.hypTokens.join(' ') || '—'}</span>
                  </div>
                )}

                {/* Alignment */}
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-[11px] font-medium text-white/60 uppercase tracking-wider">Alignment</span>
                    {(['sub', 'del', 'ins'] as const).map((t) => (
                      <span key={t} className={`text-[10px] ${OP_STYLE[t].text}`}>
                        {OP_STYLE[t].letter} = {OP_STYLE[t].label}
                      </span>
                    ))}
                  </div>
                  <div className="pt-1.5">
                    <WerAlignment ops={result.ops} />
                  </div>
                </div>

                {/* Metrics */}
                <div className="flex flex-wrap gap-3">
                  <Stat
                    label="WER"
                    value={formatRate(result.wer)}
                    detail={`(${result.substitutions}S + ${result.deletions}D + ${result.insertions}I) / ${result.refLength}`}
                    color="#FCD34D"
                  />
                  <Stat
                    label="CER"
                    value={formatRate(result.cer)}
                    detail="character edits / reference characters"
                    color="#7DD3FC"
                  />
                  <Stat
                    label="Entity error rate"
                    value={formatRate(result.entityErrorRate)}
                    detail={
                      result.entityErrorRate === null
                        ? 'no tracked entity found in reference'
                        : `${result.entities.filter((e) => e.found && !e.correct).length} of ${result.entities.filter((e) => e.found).length} entities wrong`
                    }
                    color="#FDA4AF"
                  />
                </div>

                {/* Entity breakdown */}
                {result.entities.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {result.entities.map((e) => (
                      <span
                        key={e.phrase}
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] ${
                          !e.found ? 'border-white/10 text-white/30'
                            : e.correct ? 'border-emerald-500/40 text-emerald-300'
                            : 'border-rose-500/40 text-rose-300'
                        }`}
                      >
                        {e.found ? (e.correct ? <Check size={11} /> : <Ban size={11} />) : null}
                        {e.phrase}
                        {!e.found && <span className="text-white/25">(not in reference)</span>}
                      </span>
                    ))}
                  </div>
                )}

                {/* Plain-language reading */}
                <p className="text-[11px] text-white/45 leading-relaxed">
                  {result.wer === null
                    ? 'Add a reference to compute WER — it is defined relative to what was actually said.'
                    : errors === 0
                      ? 'Perfect transcript after normalisation: no substitutions, deletions, or insertions.'
                      : `${errors} edit${errors === 1 ? '' : 's'} would turn the transcript back into the reference, out of ${result.refLength} reference word${result.refLength === 1 ? '' : 's'}. Every edit counts the same, whichever word it hits.`}
                </p>
              </div>

              {/* Footer */}
              {onSave && (
                <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-white/8 shrink-0">
                  {saved && <span className="text-[11px] text-emerald-300">Saved — plays on the node during playback</span>}
                  <button
                    type="button"
                    onClick={() => { onSave({ reference, transcript, entities, normalization }); setSaved(true) }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-amber-900/40 border border-amber-700/40 text-amber-200 hover:bg-amber-800/50 hover:text-white transition-colors"
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
