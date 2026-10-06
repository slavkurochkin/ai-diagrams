import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Ban, Pin, ArrowRight } from 'lucide-react'
import {
  agreementWithHumans,
  ANSWERS,
  CONTEXT_NOTE,
  CRITERIA,
  GOLDEN_EXAMPLE,
  GOLDEN_STEPS,
  JUDGE_BIASES,
  JUDGE_VERSIONS,
  judgePrompt,
  judgeReply,
  LABELED,
  marginOfError,
  onScale,
  PASS_MARK,
  QUESTION,
  REFERENCE,
  REAL_VS_SYNTHETIC,
  REPEAT_RUNS,
  rubricScore,
  SOURCE_CHUNK,
  spread,
  stdDev,
  stdDevOfAverage,
  SYNTHETIC_QUESTIONS,
  type JudgeVersion,
  type Scale,
} from '../../lib/judge'

// LLM Judge Visualizer: where the answer key comes from (tabs 1–2: the golden dataset, and synthetic data),
// how a judge turns a rubric into a score (tab 3), how noisy it is (tab 4), how biased (tab 5), and how to check
// it against human labels (tab 6).
// Deterministic worked examples, no model calls.

export type Tab = 'golden' | 'synthetic' | 'grade' | 'consistency' | 'bias' | 'trust'

const TABS: { id: Tab; label: string }[] = [
  { id: 'golden', label: 'Answer key' },
  { id: 'synthetic', label: 'Synthetic data' },
  { id: 'grade', label: 'Grade an answer' },
  { id: 'consistency', label: 'Is it consistent?' },
  { id: 'bias', label: 'Is it biased?' },
  { id: 'trust', label: 'Can we trust it?' },
]

const TRUST_QUESTIONS = ['Agrees with people?', 'Better than guessing?', 'Enough labels?']

const SCALES: { id: Scale; label: string }[] = [
  { id: '0-1', label: '0–1' },
  { id: '1-5', label: '1–5' },
  { id: 'pass-fail', label: 'Pass / Fail' },
]

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

const pct = (x: number) => `${Math.round(x * 100)}%`
/** Whole numbers as-is, others to two decimals: 1, 0.4, 0.63. */
const num = (x: number) => (Number.isInteger(x) ? String(x) : String(Number(x.toFixed(2))))

interface JudgePanelProps {
  open: boolean
  onClose: () => void
  /** Tab shown when the panel opens (default: the answer key). */
  initialTab?: Tab
}

export default function JudgePanel({ open, onClose, initialTab = 'golden' }: JudgePanelProps) {
  const [tab, setTab] = useState<Tab>(initialTab)
  const [step, setStep] = useState(0)
  const [showPrompt, setShowPrompt] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [reviewed, setReviewed] = useState(false)
  const [sample, setSample] = useState<12 | 200>(12)
  /** Trust tab: which question is in focus; each shows only the numbers it needs. 'all' shows everything. */
  const [question, setQuestion] = useState<'all' | 1 | 2 | 3>('all')
  const shows = (n: 2 | 3) => question === 'all' || question === n
  const [answerId, setAnswerId] = useState(ANSWERS[0].id)
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => Object.fromEntries(CRITERIA.map((c) => [c.id, true])))
  const [scale, setScale] = useState<Scale>('0-1')
  const [pinned, setPinned] = useState(false)
  const [averaged, setAveraged] = useState(false)
  const [showMath, setShowMath] = useState(false)
  const [bothOrders, setBothOrders] = useState(false)
  const [version, setVersion] = useState<JudgeVersion>('v1')

  useEffect(() => {
    if (!open) return
    setTab(initialTab); setStep(0); setShowPrompt(false); setGenerated(false); setReviewed(false); setSample(12); setQuestion('all'); setAnswerId(ANSWERS[0].id); setScale('0-1'); setPinned(false); setAveraged(false); setShowMath(false); setBothOrders(false); setVersion('v1')
    setEnabled(Object.fromEntries(CRITERIA.map((c) => [c.id, true])))
  }, [open, initialTab])

  const answer = ANSWERS.find((a) => a.id === answerId)!
  const score = rubricScore(answer, enabled)
  const passedWeight = CRITERIA.filter((c) => enabled[c.id] && answer.verdicts[c.id].pass).reduce((s, c) => s + c.weight, 0)
  const totalWeight = CRITERIA.filter((c) => enabled[c.id]).reduce((s, c) => s + c.weight, 0)
  const runs = pinned ? REPEAT_RUNS.pinned : REPEAT_RUNS.unpinned
  const runStats = spread(runs)
  const runSd = stdDev(runs)
  const calib = useMemo(() => agreementWithHumans(JUDGE_VERSIONS[version].verdicts), [version])
  const margin = marginOfError(calib.agreement, sample)

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="judge-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            key="judge-panel"
            initial={{ opacity: 0, scale: 0.97, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-3xl max-h-[calc(100vh-2rem)] flex flex-col bg-gray-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">

              {/* Header + tabs */}
              <div className="px-5 pt-3 border-b border-white/8 shrink-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-[14px] font-semibold text-white">LLM Judge Visualizer</h2>
                    <p className="text-[11px] text-white/40 mt-0.5">Like a teacher grading essays: an answer key, a marking scheme, and a check on the grader</p>
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

              <div className="flex-1 overflow-y-auto min-h-0 px-5 py-4 flex flex-col gap-4">

                {/* ── Tab 1: the golden dataset (answer key) ─────────────── */}
                {tab === 'golden' && (
                  <>
                    <div className="flex flex-col gap-2" data-section="golden-example">
                      <span className="text-[11px] font-medium text-white/60 uppercase tracking-wider">One golden example · <span className="normal-case tracking-normal text-white/35">{GOLDEN_EXAMPLE.id}</span></span>
                      <div className="rounded-lg border border-amber-400/25 bg-amber-400/[0.04] px-3 py-2 text-[11px] leading-relaxed grid grid-cols-[7.5rem_1fr] gap-x-2 gap-y-1">
                        <span className="text-white/40">Conversation</span>
                        <span className="text-white/60">{GOLDEN_EXAMPLE.conversation.join(' · ')}</span>
                        <span className="text-white/40">Question</span>
                        <span className="text-white">“{GOLDEN_EXAMPLE.question}”</span>
                        <span className="text-white/40" data-golden="reference">Reference answer</span>
                        <span className="text-white">{GOLDEN_EXAMPLE.reference}</span>
                        <span className="text-white/40">Must include</span>
                        <span className="flex flex-wrap gap-1">{GOLDEN_EXAMPLE.mustInclude.map((f) => <span key={f} className="px-1.5 rounded bg-white/10 text-white/80">{f}</span>)}</span>
                        <span className="text-white/40">Source</span>
                        <span className="text-white/70">{GOLDEN_EXAMPLE.source}</span>
                        <span className="text-white/40">Written by</span>
                        <span className="text-white/70">{GOLDEN_EXAMPLE.writtenBy}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 border-t border-white/8 pt-3" data-section="golden-steps">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-white/60 uppercase tracking-wider">How you build the golden set</span>
                        <Chip active={false} onClick={() => setStep((n) => Math.min(n + 1, GOLDEN_STEPS.length - 1))} label="Next step">Next step <ArrowRight size={11} className="inline -mt-0.5" /></Chip>
                      </div>
                      {GOLDEN_STEPS.map((st, i) => (
                        <button
                          key={st.title}
                          type="button"
                          onClick={() => setStep(i)}
                          aria-label={`Step ${i + 1}: ${st.title}`}
                          data-step={i + 1}
                          className={`text-left rounded-md px-2.5 py-1.5 border transition-colors ${i === step ? 'border-violet-400/50 bg-violet-500/10' : 'border-transparent hover:bg-white/[0.04]'}`}
                        >
                          <div className={`text-[12px] ${i === step ? 'text-white' : i < step ? 'text-white/60' : 'text-white/40'}`}>
                            <span className="tabular-nums text-white/35 mr-2">{i + 1}</span>{st.title}
                          </div>
                          {i === step && <div className="text-[11px] text-white/60 leading-relaxed mt-0.5 ml-5">{st.detail}</div>}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {/* ── Tab 2: synthetic data ───────────────────────────────── */}
                {tab === 'synthetic' && (
                  <>
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] leading-relaxed" data-section="chunk">
                      <div className="text-white/40">Source chunk · {SOURCE_CHUNK.source}</div>
                      <div className="text-white/80">{SOURCE_CHUNK.text}</div>
                    </div>

                    <div className="flex flex-col gap-1.5" data-section="synthetic-list">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-medium text-white/60 uppercase tracking-wider">Questions a model drafts from it</span>
                        <div className="flex gap-1">
                          <Chip active={generated} onClick={() => setGenerated(true)} label="Generate questions">Generate</Chip>
                          <Chip active={reviewed} onClick={() => { setGenerated(true); setReviewed(true) }} label="Review each one">A person reviews</Chip>
                        </div>
                      </div>
                      {!generated && <div className="text-[11px] text-white/35 px-1">Nothing yet: a model reads the chunk and drafts test questions.</div>}
                      {generated && SYNTHETIC_QUESTIONS.map((q) => (
                        <div key={q.question} className={`rounded-md px-2.5 py-1 ${reviewed && !q.keep ? 'opacity-50' : ''}`} data-synthetic={q.keep ? 'keep' : 'reject'}>
                          <div className="flex items-center gap-2 text-[12px]">
                            {reviewed && <span className={`shrink-0 ${q.keep ? 'text-emerald-400' : 'text-rose-400'}`}>{q.keep ? <Check size={13} /> : <Ban size={13} />}</span>}
                            <span className={`flex-1 text-white/85 ${reviewed && !q.keep ? 'line-through' : ''}`}>“{q.question}”</span>
                            <span className="shrink-0 px-1.5 rounded bg-white/10 text-[10px] text-white/60">{q.method}</span>
                          </div>
                          {reviewed && <div className="text-[10.5px] text-white/45 ml-5">{q.review}</div>}
                        </div>
                      ))}
                    </div>

                    {reviewed && (
                      <div className="flex flex-col gap-1.5 border-t border-white/8 pt-3" data-section="real-vs-synthetic">
                        <span className="text-[11px] font-medium text-white/60 uppercase tracking-wider">Judge pass rate: real vs. synthetic questions</span>
                        {([['Real', REAL_VS_SYNTHETIC.real], ['Synthetic', REAL_VS_SYNTHETIC.synthetic]] as const).map(([name, rate]) => (
                          <div key={name} className="flex items-center gap-2 text-[11px]">
                            <span className="w-16 text-white/60">{name}</span>
                            <div className="flex-1 h-2.5 rounded bg-white/[0.06] overflow-hidden"><div className={`h-full ${name === 'Real' ? 'bg-sky-400/70' : 'bg-violet-400/70'}`} style={{ width: pct(rate) }} /></div>
                            <span className="w-9 text-right tabular-nums text-white">{pct(rate)}</span>
                          </div>
                        ))}
                        <div className="text-[11px] text-white/45">Synthetic questions are easier than real ones. Tag them, mix them with real questions, and watch this gap.</div>
                      </div>
                    )}
                  </>
                )}

                {/* ── Tab 3: grade an answer ─────────────────────────────── */}
                {tab === 'grade' && (
                  <>
                    {!showPrompt && (
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] leading-relaxed" data-section="question">
                      <div className="text-white/80"><span className="text-white/40">Question:</span> “{QUESTION}” <span className="text-white/35">({CONTEXT_NOTE})</span></div>
                      <div className="text-white/80"><span className="text-white/40">Reference (from the golden set):</span> {REFERENCE}</div>
                    </div>
                    )}

                    <div className="flex flex-col gap-2" data-section="answers">
                      <span className="text-[11px] font-medium text-white/60 uppercase tracking-wider">Answer being judged</span>
                      <div className="flex flex-wrap gap-1.5">
                        {ANSWERS.map((a) => (
                          <Chip key={a.id} active={a.id === answerId} onClick={() => setAnswerId(a.id)} label={`Answer: ${a.label}`}>{a.label}</Chip>
                        ))}
                      </div>
                      <div className="text-[12px] text-white/85 leading-relaxed rounded-lg bg-white/[0.04] px-3 py-2">{answer.text}</div>
                    </div>

                    {showPrompt ? (
                      <div className="flex flex-col gap-1.5" data-section="prompt">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-white/60 uppercase tracking-wider">What the judge model sees, and what it sends back</span>
                          <Chip active onClick={() => setShowPrompt(false)} label="Show the judge's prompt">Hide the prompt</Chip>
                        </div>
                        <pre className="text-[10px] leading-snug text-white/75 bg-black/40 border border-white/10 rounded-lg px-3 py-2 whitespace-pre-wrap font-mono" data-prompt="in">{judgePrompt(answer, enabled)}</pre>
                        <pre className="text-[10px] leading-snug text-emerald-200/80 bg-black/40 border border-white/10 rounded-lg px-3 py-2 whitespace-pre-wrap font-mono" data-prompt="out">{judgeReply(answer, enabled)}</pre>
                      </div>
                    ) : (
                    <div className="flex flex-col gap-1.5" data-section="rubric">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-white/60 uppercase tracking-wider">Rubric · the judge’s verdict per criterion</span>
                        <Chip active={false} onClick={() => setShowPrompt(true)} label="Show the judge's prompt">Show the prompt</Chip>
                      </div>
                      {CRITERIA.map((c) => {
                        const v = answer.verdicts[c.id]
                        const on = enabled[c.id]
                        return (
                          <div key={c.id} data-criterion={c.id} className={`flex items-center gap-2 rounded-md px-2 py-1 ${on ? '' : 'opacity-35'}`}>
                            <button
                              type="button"
                              onClick={() => setEnabled((e) => ({ ...e, [c.id]: !e[c.id] }))}
                              aria-label={`Criterion: ${c.label}`}
                              aria-pressed={on}
                              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${on ? 'bg-violet-500/70 border-violet-400' : 'border-white/25'}`}
                            >
                              {on && <Check size={11} className="text-white" />}
                            </button>
                            <span className="w-28 shrink-0 text-[12px] text-white">{c.label} <span className="text-white/35">×{c.weight}</span></span>
                            <span className={`shrink-0 ${v.pass ? 'text-emerald-400' : 'text-rose-400'}`}>{v.pass ? <Check size={14} /> : <Ban size={14} />}</span>
                            <span className="text-[11px] text-white/55 truncate">{v.reason}</span>
                          </div>
                        )
                      })}
                    </div>
                    )}

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/8 pt-3" data-section="score">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-white/40">Score</div>
                        <div className={`text-[26px] font-bold tabular-nums leading-tight ${score >= PASS_MARK ? 'text-emerald-300' : 'text-rose-300'}`} data-score>
                          {onScale(score, scale)}
                        </div>
                      </div>
                      <div className="text-[11px] text-white/50 font-mono">
                        passed weight ÷ total = {passedWeight} ÷ {totalWeight} = {score.toFixed(2)}
                        <div className="font-sans text-white/35">pass mark {PASS_MARK} · 1–5 = 1 + 4 × score</div>
                      </div>
                      <div className="flex gap-1 ml-auto">
                        {SCALES.map((s) => (
                          <Chip key={s.id} active={scale === s.id} onClick={() => setScale(s.id)} label={`Scale: ${s.label}`}>{s.label}</Chip>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* ── Tab 4: consistency and position bias ───────────────── */}
                {tab === 'consistency' && (
                  <>
                    <div className="flex flex-col gap-2" data-section="repeats">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-white/60 uppercase tracking-wider">Same answer, judged 5 times (1–5)</span>
                        <Chip active={showMath} onClick={() => setShowMath((m) => !m)} label="Show the math">Show the math</Chip>
                      </div>
                      <div className="flex items-end gap-5">
                        <div className="relative flex items-end gap-3" style={{ height: `${5 * 14}px` }}>
                          {runs.map((r, i) => (
                            <div key={i} className="w-10 rounded-md bg-violet-500/60" style={{ height: `${r * 14}px` }} data-run={i + 1} />
                          ))}
                          <div className="absolute -left-1 -right-1 border-t border-dashed border-amber-300/80" style={{ bottom: `${runStats.mean * 14}px` }} data-stat="mean-line" />
                        </div>
                        <div className="text-[11px] text-white/55 leading-relaxed">
                          <span className="text-amber-300">- - -</span> average <b className="text-white">{runStats.mean.toFixed(1)}</b>
                          <div data-stat="sd">standard deviation <b className="text-white">{runSd.toFixed(2)}</b></div>
                          <div className="text-white/40">≈ how far a typical run lands from the average</div>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        {runs.map((r, i) => (
                          <div key={i} className="w-10 flex flex-col items-center">
                            <span className={`text-[13px] font-semibold tabular-nums ${r >= 4 ? 'text-emerald-300' : 'text-rose-300'}`}>{r}</span>
                            <span className="text-[9px] text-white/30">run {i + 1}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {showMath && (
                      <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[11px] font-mono text-white/70 leading-relaxed" data-section="sd-math">
                        <div><span className="text-white/35">1 · average:</span> ({runs.join(' + ')}) ÷ {runs.length} = <b className="text-white">{runStats.mean.toFixed(1)}</b></div>
                        <div><span className="text-white/35">2 · distance from it:</span> {runs.map((r) => num(Math.abs(r - runStats.mean))).join(', ')}</div>
                        <div><span className="text-white/35">3 · square, then average:</span> ({runs.map((r) => num((r - runStats.mean) ** 2)).join(' + ')}) ÷ {runs.length} = {num(runSd ** 2)}</div>
                        <div><span className="text-white/35">4 · square root:</span> √{num(runSd ** 2)} = <b className="text-white">{runSd.toFixed(2)}</b></div>
                      </div>
                    )}

                    <div className="flex flex-col gap-2 border-t border-white/8 pt-3" data-section="fixes">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-white/60 uppercase tracking-wider">Two fixes</span>
                        <div className="flex gap-1">
                          <Chip active={pinned} onClick={() => setPinned((p) => !p)} label="Pin the judge"><Pin size={11} className="inline -mt-0.5" /> 1 · Pin the model</Chip>
                          <Chip active={averaged} onClick={() => setAveraged((a) => !a)} label="Average the runs">2 · Average the runs</Chip>
                        </div>
                      </div>
                      {!pinned && !averaged && (
                        <div className="text-[11.5px] text-white/55">With a pass mark of 4, run 4 fails an answer the other runs pass. One run decides the verdict by luck.</div>
                      )}
                      {pinned && (
                        <div className="text-[11.5px] text-white/70" data-fix="pin">
                          <b className="text-white">Pin the model:</b> a fixed model version and temperature 0, so the same input gets the same reply. Every run scores 4: standard deviation 0.
                        </div>
                      )}
                      {averaged && (
                        <div className="text-[11.5px] text-white/70" data-fix="average">
                          <b className="text-white">Average the runs:</b> score = the average of {runs.length} runs = <b className="text-white">{runStats.mean.toFixed(1)}</b>. One run is off by about {runSd.toFixed(2)}; the average of {runs.length} by {runSd.toFixed(2)} ÷ √{runs.length} = <b className="text-white">{stdDevOfAverage(runSd, runs.length).toFixed(2)}</b>.
                          <div className="text-white/40">For models you can’t pin: many reasoning models don’t take a temperature.</div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* ── Tab 5: bias ─────────────────────────────────────────── */}
                {tab === 'bias' && (
                  <>
                    <div className="flex flex-col gap-2" data-section="position">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-white/60 uppercase tracking-wider">Old prompt or new prompt: which answer is better?</span>
                        <Chip active={bothOrders} onClick={() => setBothOrders((b) => !b)} label="Judge both orders">Judge both orders</Chip>
                      </div>
                      <div className="text-[11.5px] text-white/50">Priya changed her prompt. For each test question, the judge sees both versions’ answers and picks the better one.</div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]" data-section="pair">
                        <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-white/75"><b className="text-white">A · old prompt</b><div>Monthly plans can be cancelled anytime; partial months aren’t refunded. [doc 2]</div></div>
                        <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-white/75"><b className="text-white">B · new prompt</b><div>You can cancel a monthly plan whenever you like; unused days aren’t refunded. [doc 2]</div></div>
                      </div>
                      <div className="flex flex-col gap-1 text-[12px]">
                        <div className="text-white/75">Shown <b>A first</b> → judge picks <b className="text-amber-300">A, the old prompt</b></div>
                        {bothOrders && <div className="text-white/75">Shown <b>B first</b> → judge picks <b className="text-amber-300">B, the new prompt</b></div>}
                        <div className={`mt-1 rounded-md px-2.5 py-1.5 ${bothOrders ? 'bg-amber-500/15 text-amber-200' : 'bg-white/[0.04] text-white/60'}`} data-verdict>
                          {bothOrders
                            ? 'The winner follows the order, not the answers: position bias. Verdict: a tie. Neither prompt is better here.'
                            : 'Verdict: keep the old prompt? (Judged one way only, so you can’t tell bias from preference.)'}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 border-t border-white/8 pt-3" data-section="biases">
                      <span className="text-[11px] font-medium text-white/60 uppercase tracking-wider">Common judge biases</span>
                      {JUDGE_BIASES.map((b) => (
                        <div key={b.name} className="grid grid-cols-[7rem_1fr_1fr] gap-2 text-[11px]" data-bias={b.name}>
                          <span className="text-white">{b.name}</span>
                          <span className="text-white/55">{b.what}</span>
                          <span className="text-emerald-300/80">fix: {b.fix}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* ── Tab 6: agreement with human labels ─────────────────── */}
                {tab === 'trust' && (
                  <>
                    <div className="flex flex-wrap items-center gap-1.5" data-section="questions">
                      <span className="text-[11px] font-medium text-white/60 uppercase tracking-wider mr-1">Three questions</span>
                      {TRUST_QUESTIONS.map((q, i) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => setQuestion(question === i + 1 ? 'all' : ((i + 1) as 1 | 2 | 3))}
                          aria-label={`Question ${i + 1}: ${q}`}
                          aria-pressed={question === i + 1}
                          data-question={i + 1}
                          className={`px-2.5 py-1 rounded-lg text-[11px] border transition-colors ${
                            question === i + 1 ? 'bg-violet-500/25 border-violet-400/60 text-white' : 'bg-white/[0.04] border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <span className="text-white/40 mr-1">{i + 1}</span>{q}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5" data-section="versions">
                      <span className="text-[11px] font-medium text-white/60 uppercase tracking-wider mr-1">Judge</span>
                      {(Object.keys(JUDGE_VERSIONS) as JudgeVersion[]).map((v) => (
                        <Chip key={v} active={version === v} onClick={() => setVersion(v)} label={`Judge: ${JUDGE_VERSIONS[v].label}`}>{JUDGE_VERSIONS[v].label}</Chip>
                      ))}
                      <span className="text-[11px] text-white/40 ml-1">{JUDGE_VERSIONS[version].note}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1" data-section="labels">
                      {[0, 1].map((col) => (
                        <div key={`h${col}`} className="flex items-center gap-2 px-1.5 text-[10px] uppercase tracking-wider text-white/35">
                          <span className="flex-1">Answer</span><span>person</span><span>judge</span>
                        </div>
                      ))}
                      {LABELED.map((it) => {
                        const j = JUDGE_VERSIONS[version].verdicts[it.id]
                        const agree = j === it.human
                        return (
                          <div key={it.id} className={`flex items-center gap-2 rounded px-1.5 py-0.5 text-[11px] ${agree ? '' : 'bg-rose-500/15'}`}>
                            <span className="flex-1 truncate text-white/70">{it.answer}</span>
                            <span title="human" className={it.human ? 'text-emerald-400' : 'text-rose-400'}>{it.human ? '✓' : '✗'}</span>
                            <span title="judge" className={j ? 'text-emerald-400' : 'text-rose-400'}>{j ? '✓' : '✗'}</span>
                          </div>
                        )
                      })}
                      <div className="col-span-2 text-[10px] text-white/30 text-right">person = label from the golden set · red = the judge disagrees with the person</div>
                    </div>

                    <div className="flex flex-wrap items-start gap-6 border-t border-white/8 pt-3" data-section="agreement">
                      <div data-stat="agreement">
                        <div className="text-[10px] uppercase tracking-wider text-white/40">Agreement</div>
                        <div className="text-[22px] font-bold tabular-nums text-white">{pct(calib.agreement)}</div>
                        <div className="text-[10px] text-white/40">{calib.bothPass + calib.bothFail} of {LABELED.length} match</div>
                      </div>
                      {shows(2) && (
                        <>
                          <div data-stat="chance">
                            <div className="text-[10px] uppercase tracking-wider text-white/40">By chance</div>
                            <div className="text-[22px] font-bold tabular-nums text-white/60">{pct(calib.chance)}</div>
                            <div className="text-[10px] text-white/40">what guessing alone gets</div>
                          </div>
                          <div data-stat="kappa">
                            <div className="text-[10px] uppercase tracking-wider text-white/40">Cohen’s κ</div>
                            <div className={`text-[22px] font-bold tabular-nums ${calib.kappa >= 0.6 ? 'text-emerald-300' : calib.kappa > 0.2 ? 'text-amber-300' : 'text-rose-300'}`}>{calib.kappa.toFixed(2)}</div>
                            <div className="text-[10px] text-white/40">how much better than chance</div>
                          </div>
                        </>
                      )}
                      {shows(3) && (
                        <>
                          <div data-stat="margin">
                            <div className="text-[10px] uppercase tracking-wider text-white/40">Margin of error</div>
                            <div className={`text-[22px] font-bold tabular-nums ${margin > 0.1 ? 'text-rose-300' : 'text-emerald-300'}`}>± {pct(margin)}</div>
                            <div className="text-[10px] text-white/40">{sample === 12 ? `from ${LABELED.length} labels` : 'if it held over 200 labels'}</div>
                          </div>
                          <div className="flex items-center gap-1 ml-auto self-center">
                            <Chip active={sample === 12} onClick={() => setSample(12)} label="Sample: 12 labels">12 labels</Chip>
                            <Chip active={sample === 200} onClick={() => setSample(200)} label="Sample: 200 labels">200 labels</Chip>
                          </div>
                          {question === 3 && (
                            <div className="basis-full flex flex-col gap-2 -mt-2" data-section="margin-math">
                              <div className="text-[11.5px] text-white/70" data-stat="per-answer">
                                Each answer is worth 100% ÷ {sample} = <b className="text-white">{num(100 / sample)} points</b>
                                {sample === LABELED.length
                                  ? <> · one more disagreement: {pct(calib.agreement)} → {pct(calib.agreement - 1 / LABELED.length)}</>
                                  : <> · one more disagreement barely moves it</>}
                              </div>
                              <div className="flex items-center gap-2 text-[10.5px] text-white/50" data-stat="range">
                                <span className="w-7 text-right">0%</span>
                                <div className="relative flex-1 h-3 rounded bg-white/[0.06]">
                                  <div className="absolute top-0 bottom-0 rounded bg-rose-400/35" style={{ left: `${Math.max(0, calib.agreement - margin) * 100}%`, right: `${(1 - Math.min(1, calib.agreement + margin)) * 100}%` }} />
                                  <div className="absolute -top-0.5 w-1 h-4 rounded bg-white" style={{ left: `calc(${calib.agreement * 100}% - 2px)` }} />
                                </div>
                                <span className="w-9">100%</span>
                                <span className="text-white/80 tabular-nums">real agreement: somewhere in {pct(Math.max(0, calib.agreement - margin))}–{pct(Math.min(1, calib.agreement + margin))}</span>
                              </div>
                              <div className="text-[11px] font-mono text-white/55" data-stat="margin-formula">
                                margin ≈ 2 × √(agreement × (1 − agreement) ÷ labels) = 2 × √({calib.agreement.toFixed(2)} × {(1 - calib.agreement).toFixed(2)} ÷ {sample}) = ± {pct(margin)}
                                <div className="font-sans text-white/35">The 2 gives about 95% confidence: 19 times in 20, the real agreement lands in this range.</div>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      {(question === 'all' || question === 2) && (
                        <div className="basis-full text-[11px] text-white/55 font-mono" data-stat="formula">
                          κ = (agreement − chance) ÷ (100% − chance) = ({pct(calib.agreement)} − {pct(calib.chance)}) ÷ (100% − {pct(calib.chance)}) = {calib.kappa.toFixed(2)}
                          <span className="font-sans text-white/35"> · 0 = no better than guessing, 1 = perfect · aim for ≥ 0.6</span>
                        </div>
                      )}
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
