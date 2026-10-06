import { useEffect, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Ban, CircleHelp } from 'lucide-react'
import {
  answerById,
  answerRelevancy,
  CASES,
  caseScores,
  CHUNKS,
  CONTEXT_NOTE,
  contextPrecision,
  contextRecall,
  faithfulness,
  HEALTHY,
  isUseful,
  QUESTION,
  REFERENCE_FACTS,
  RETRIEVALS,
  type ClaimVerdict,
  type RetrievalId,
} from '../../lib/generationMetrics'

// Generation Metrics Visualizer: faithfulness (claims checked against the chunks: the hallucination check), answer
// relevancy (questions the answer fits vs. the real one), context recall and precision (reference facts found,
// useful chunks ranked high), and a diagnosis tab (which metric drops points at the retriever or the generator).
// Deterministic worked examples, no model calls.

export type GenTab = 'faithfulness' | 'relevancy' | 'context' | 'diagnose'

const TABS: { id: GenTab; label: string }[] = [
  { id: 'faithfulness', label: 'Faithfulness' },
  { id: 'relevancy', label: 'Answer relevancy' },
  { id: 'context', label: 'Context recall & precision' },
  { id: 'diagnose', label: 'Diagnose' },
]

const FAITH_ANSWERS = ['faithful', 'madeup', 'outside', 'offtopic']
const REL_ANSWERS = ['faithful', 'madeup', 'offtopic']

function Chip({ active, onClick, label, children }: { active: boolean; onClick: () => void; label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`px-2.5 py-1 rounded-lg text-[11px] border transition-colors ${
        active ? 'bg-white/15 border-white/30 text-white' : 'bg-white/[0.04] border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

const Heading = ({ children }: { children: ReactNode }) => (
  <span className="text-[11px] font-medium text-white/60 uppercase tracking-wider">{children}</span>
)

const scoreColor = (x: number) => (x >= HEALTHY ? 'text-emerald-300' : 'text-rose-300')

const VERDICT: Record<ClaimVerdict, { label: string; cls: string; icon: ReactNode }> = {
  supported: { label: 'supported', cls: 'text-emerald-400', icon: <Check size={13} /> },
  contradicted: { label: 'contradicted', cls: 'text-rose-400', icon: <Ban size={13} /> },
  unsupported: { label: 'not in the chunks', cls: 'text-amber-300', icon: <CircleHelp size={13} /> },
}

interface GenerationEvalPanelProps {
  open: boolean
  onClose: () => void
  /** Tab shown when the panel opens (default: faithfulness). */
  initialTab?: GenTab
}

export default function GenerationEvalPanel({ open, onClose, initialTab = 'faithfulness' }: GenerationEvalPanelProps) {
  const [tab, setTab] = useState<GenTab>(initialTab)
  const [faithAnswer, setFaithAnswer] = useState('faithful')
  const [split, setSplit] = useState(false)
  const [checked, setChecked] = useState(false)
  const [relAnswer, setRelAnswer] = useState('faithful')
  const [generated, setGenerated] = useState(false)
  const [retrieval, setRetrieval] = useState<RetrievalId>('good')
  const [caseId, setCaseId] = useState(CASES[0].id)

  useEffect(() => {
    if (!open) return
    setTab(initialTab); setFaithAnswer('faithful'); setSplit(false); setChecked(false)
    setRelAnswer('faithful'); setGenerated(false); setRetrieval('good'); setCaseId(CASES[0].id)
  }, [open, initialTab])

  const fa = answerById(faithAnswer)
  const faith = faithfulness(fa)
  const ra = answerById(relAnswer)
  const relevancy = answerRelevancy(ra)
  const chunks = RETRIEVALS[retrieval].chunks
  const recall = contextRecall(chunks)
  const precision = contextPrecision(chunks)
  const dCase = CASES.find((c) => c.id === caseId)!
  const dScores = caseScores(dCase)

  const questionBox = (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] leading-relaxed" data-section="question">
      <span className="text-white/40">Question:</span> <span className="text-white/85">“{QUESTION}”</span> <span className="text-white/35">({CONTEXT_NOTE})</span>
    </div>
  )

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="gen-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            key="gen-panel"
            initial={{ opacity: 0, scale: 0.97, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-2xl max-h-[calc(100vh-2rem)] flex flex-col bg-gray-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">

              {/* Header + tabs */}
              <div className="px-5 pt-3 border-b border-white/8 shrink-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-[14px] font-semibold text-white">Generation Metrics Visualizer</h2>
                    <p className="text-[11px] text-white/40 mt-0.5">Did the answer stick to the documents, answer the question, and get the facts it needed?</p>
                  </div>
                  <button type="button" onClick={onClose} aria-label="Close visualizer" className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors">
                    <X size={15} />
                  </button>
                </div>
                <div className="flex gap-1 mt-2" role="tablist">
                  {TABS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      role="tab"
                      aria-selected={tab === t.id}
                      onClick={() => setTab(t.id)}
                      className={`px-3 py-1.5 text-[12px] rounded-t-md border-b-2 transition-colors ${
                        tab === t.id ? 'border-violet-400 text-white' : 'border-transparent text-white/45 hover:text-white/80'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0 px-5 py-4 flex flex-col gap-3.5">

                {/* ── Faithfulness ─────────────────────────────────────────── */}
                {tab === 'faithfulness' && (
                  <>
                    <div className="flex flex-col gap-1" data-section="chunks">
                      <div className="text-[11px]"><span className="text-white/40">Question:</span> <span className="text-white/85">“{QUESTION}”</span> <span className="text-white/35">· retrieved chunks, what the model was given:</span></div>
                      {RETRIEVALS.good.chunks.map((id, i) => (
                        <div key={id} className="flex gap-2 text-[11px]" data-chunk={id}>
                          <span className="w-4 text-white/30 tabular-nums">{i + 1}</span>
                          <span className="w-16 shrink-0 text-white/40">{CHUNKS[id].doc}</span>
                          <span className="text-white/70 truncate">{CHUNKS[id].text}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col gap-2 border-t border-white/8 pt-3" data-section="answers">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Heading>Answer</Heading>
                        {FAITH_ANSWERS.map((id) => (
                          <Chip key={id} active={id === faithAnswer} onClick={() => setFaithAnswer(id)} label={`Answer: ${answerById(id).label}`}>{answerById(id).label}</Chip>
                        ))}
                      </div>
                      <div className="text-[12px] text-white/85 leading-relaxed rounded-lg bg-white/[0.04] px-3 py-2">{fa.text}</div>
                    </div>

                    <div className="flex flex-col gap-1" data-section="claims">
                      <div className="flex items-center justify-between">
                        <Heading>Claims</Heading>
                        <div className="flex gap-1">
                          <Chip active={split} onClick={() => setSplit(true)} label="Split into claims">1 · Split into claims</Chip>
                          <Chip active={checked} onClick={() => { setSplit(true); setChecked(true) }} label="Check each claim">2 · Check each against the chunks</Chip>
                        </div>
                      </div>
                      {!split && <div className="text-[11px] text-white/35 px-1">A judge model breaks the answer into single factual claims.</div>}
                      {split && fa.claims.map((c) => (
                        <div key={c.text} className="flex items-center gap-2 text-[11.5px] px-1 min-w-0" data-claim={checked ? c.verdict : 'pending'}>
                          <span className={`w-4 shrink-0 ${checked ? VERDICT[c.verdict].cls : 'text-white/25'}`}>{checked ? VERDICT[c.verdict].icon : '•'}</span>
                          <span className="shrink-0 text-white/85">{c.text}</span>
                          {checked && (
                            <span className="ml-auto min-w-0 truncate text-[10.5px] text-right">
                              <span className={VERDICT[c.verdict].cls}>{VERDICT[c.verdict].label}</span>
                              <span className="text-white/40"> · {c.chunk ? `${CHUNKS[c.chunk].doc}: ` : ''}{c.note}</span>
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {checked && (
                      <div className="flex items-center gap-4 border-t border-white/8 pt-3" data-section="faithfulness-score">
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-white/40">Faithfulness</div>
                          <div className={`text-[24px] font-bold tabular-nums leading-tight ${scoreColor(faith.score)}`}>{faith.score.toFixed(2)}</div>
                        </div>
                        <div className="text-[11px] text-white/50 font-mono">
                          supported ÷ claims = {faith.supported} ÷ {faith.total} = {faith.score.toFixed(2)}
                          <div className="font-sans text-white/35">Backed by the chunks, not “true in the world”.</div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ── Answer relevancy ─────────────────────────────────────── */}
                {tab === 'relevancy' && (
                  <>
                    {questionBox}
                    <div className="flex flex-col gap-2" data-section="answers">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Heading>Answer</Heading>
                        {REL_ANSWERS.map((id) => (
                          <Chip key={id} active={id === relAnswer} onClick={() => setRelAnswer(id)} label={`Answer: ${answerById(id).label}`}>{answerById(id).label}</Chip>
                        ))}
                      </div>
                      <div className="text-[12px] text-white/85 leading-relaxed rounded-lg bg-white/[0.04] px-3 py-2">{ra.text}</div>
                    </div>

                    <div className="flex flex-col gap-1.5" data-section="reverse">
                      <div className="flex items-center justify-between">
                        <Heading>Questions this answer would fit</Heading>
                        <Chip active={generated} onClick={() => setGenerated(true)} label="Generate questions">Generate from the answer</Chip>
                      </div>
                      {!generated && <div className="text-[11px] text-white/35 px-1">A model reads only the answer and writes the questions it would answer.</div>}
                      {generated && ra.reverseQuestions.map((q) => (
                        <div key={q.question} className="flex items-center gap-2 text-[11.5px]">
                          <span className="flex-1 text-white/80">“{q.question}”</span>
                          <div className="w-28 h-2 rounded bg-white/[0.06] overflow-hidden"><div className={`h-full ${q.similarity >= HEALTHY ? 'bg-emerald-400/70' : 'bg-rose-400/70'}`} style={{ width: `${q.similarity * 100}%` }} /></div>
                          <span className="w-9 text-right tabular-nums text-white">{q.similarity.toFixed(2)}</span>
                        </div>
                      ))}
                      {generated && <div className="text-[10.5px] text-white/35 text-right">similarity to “{QUESTION}”, by meaning (embeddings), not shared words</div>}
                    </div>

                    {generated && (
                      <div className="flex items-center gap-4 border-t border-white/8 pt-3" data-section="relevancy-score">
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-white/40">Answer relevancy</div>
                          <div className={`text-[24px] font-bold tabular-nums leading-tight ${scoreColor(relevancy)}`}>{relevancy.toFixed(2)}</div>
                        </div>
                        <div className="text-[11px] text-white/50 font-mono">
                          average similarity = ({ra.reverseQuestions.map((q) => q.similarity.toFixed(2)).join(' + ')}) ÷ {ra.reverseQuestions.length}
                          <div className="font-sans text-white/35">Checks the answer is on topic. It doesn’t check that it’s true.</div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ── Context recall & precision ───────────────────────────── */}
                {tab === 'context' && (
                  <>
                    <div className="flex flex-wrap items-center gap-1.5" data-section="retrievals">
                      <Heading>Retrieval</Heading>
                      {(Object.keys(RETRIEVALS) as RetrievalId[]).map((r) => (
                        <Chip key={r} active={r === retrieval} onClick={() => setRetrieval(r)} label={`Retrieval: ${RETRIEVALS[r].label}`}>{RETRIEVALS[r].label}</Chip>
                      ))}
                      <span className="text-[11px] text-white/40 ml-1">{RETRIEVALS[retrieval].note}</span>
                    </div>

                    <div className="flex flex-col gap-1" data-section="facts">
                      <Heading>Context recall · are the reference’s facts in the chunks?</Heading>
                      {REFERENCE_FACTS.map((f) => {
                        const found = recall.found.includes(f.id)
                        return (
                          <div key={f.id} className="flex items-center gap-2 text-[11.5px] px-1" data-fact={found ? 'found' : 'missing'}>
                            <span className={found ? 'text-emerald-400' : 'text-rose-400'}>{found ? <Check size={13} /> : <Ban size={13} />}</span>
                            <span className="text-white/85">{f.text}</span>
                            <span className="ml-auto text-[10.5px] text-white/40">{found ? `in ${chunks.filter((c) => CHUNKS[c].facts.includes(f.id)).map((c) => CHUNKS[c].doc).join(', ')}` : 'not retrieved'}</span>
                          </div>
                        )
                      })}
                      <div className="text-[11px] text-white/55 font-mono px-1" data-stat="recall">
                        recall = {recall.found.length} ÷ {REFERENCE_FACTS.length} = <b className={scoreColor(recall.score)}>{recall.score.toFixed(2)}</b>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 border-t border-white/8 pt-3" data-section="ranked">
                      <Heading>Context precision · are the useful chunks at the top?</Heading>
                      {chunks.map((id, i) => {
                        const at = precision.atUseful.find((p) => p.rank === i + 1)
                        return (
                          <div key={id} className={`flex items-center gap-2 text-[11px] rounded px-1 ${isUseful(id) ? 'bg-emerald-500/10' : ''}`} data-rank={i + 1}>
                            <span className="w-4 text-white/30 tabular-nums">{i + 1}</span>
                            <span className="w-16 shrink-0 text-white/40">{CHUNKS[id].doc}</span>
                            <span className={`truncate ${isUseful(id) ? 'text-white/85' : 'text-white/45'}`}>{CHUNKS[id].text}</span>
                            <span className="ml-auto shrink-0 text-[10.5px] tabular-nums">{at ? <span className="text-emerald-300">useful · {at.precision === 1 ? '1' : `${Math.round(at.precision * (i + 1))}/${i + 1}`}</span> : <span className="text-white/25">—</span>}</span>
                          </div>
                        )
                      })}
                      <div className="text-[11px] text-white/55 font-mono px-1" data-stat="precision">
                        precision = average at each useful chunk = ({precision.atUseful.map((p) => `${Math.round(p.precision * p.rank)}/${p.rank}`).join(' + ') || '0'}) ÷ {precision.atUseful.length || 1} = <b className={scoreColor(precision.score)}>{precision.score.toFixed(2)}</b>
                      </div>
                    </div>
                    <div className="text-[10.5px] text-white/35">Both compare against the golden set’s reference answer, so they need one. Faithfulness and relevancy don’t.</div>
                  </>
                )}

                {/* ── Diagnose ─────────────────────────────────────────────── */}
                {tab === 'diagnose' && (
                  <>
                    <div className="flex flex-wrap items-center gap-1.5" data-section="cases">
                      <Heading>Case</Heading>
                      {CASES.map((c) => (
                        <Chip key={c.id} active={c.id === caseId} onClick={() => setCaseId(c.id)} label={`Case: ${c.label}`}>{c.label}</Chip>
                      ))}
                    </div>
                    <div className="text-[11.5px] text-white/70 rounded-lg bg-white/[0.04] px-3 py-2">
                      <span className="text-white/40">Answer:</span> {answerById(dCase.answer).text}
                      <div className="text-white/40 mt-0.5">Retrieval: {RETRIEVALS[dCase.retrieval].label.toLowerCase()} · {RETRIEVALS[dCase.retrieval].note.toLowerCase()}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-3" data-section="scores">
                      {([
                        ['Generator', 'did the model use what it got?', [['faithfulness', 'Faithfulness'], ['answerRelevancy', 'Answer relevancy']]],
                        ['Retriever', 'did it get the right chunks?', [['contextRecall', 'Context recall'], ['contextPrecision', 'Context precision']]],
                      ] as const).map(([side, hint, metrics]) => {
                        const bad = metrics.some(([k]) => dScores[k] < HEALTHY)
                        return (
                          <div key={side} className={`rounded-lg border px-3 py-2 ${bad ? 'border-rose-400/40 bg-rose-500/[0.06]' : 'border-white/10 bg-white/[0.03]'}`} data-side={side.toLowerCase()}>
                            <div className="text-[12px] text-white">{side} <span className="text-[10.5px] text-white/40">· {hint}</span></div>
                            {metrics.map(([k, label]) => (
                              <div key={k} className="flex items-baseline justify-between text-[11.5px] mt-1" data-metric={k}>
                                <span className="text-white/60">{label}</span>
                                <span className={`text-[18px] font-bold tabular-nums ${scoreColor(dScores[k])}`}>{dScores[k].toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )
                      })}
                    </div>

                    <div className="rounded-lg border border-amber-400/25 bg-amber-400/[0.05] px-3 py-2 text-[11.5px] leading-relaxed" data-section="diagnosis">
                      <div className="text-white/85">{dCase.diagnosis}</div>
                      <div className="text-emerald-300/85">Fix: {dCase.fix}</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
