import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Ban, Pin } from 'lucide-react'
import {
  agreementWithHumans,
  ANSWERS,
  CONTEXT_NOTE,
  CRITERIA,
  JUDGE_VERSIONS,
  LABELED,
  onScale,
  PASS_MARK,
  QUESTION,
  REFERENCE,
  REPEAT_RUNS,
  rubricScore,
  spread,
  type JudgeVersion,
  type Scale,
} from '../../lib/judge'

// LLM Judge Visualizer: how a judge turns a rubric into a score (tab 1), how noisy and biased it can be
// (tab 2), and how to check it against human labels (tab 3). Deterministic worked examples, no model calls.

type Tab = 'grade' | 'consistency' | 'trust'

const TABS: { id: Tab; label: string }[] = [
  { id: 'grade', label: 'Grade an answer' },
  { id: 'consistency', label: 'Is it consistent?' },
  { id: 'trust', label: 'Can we trust it?' },
]

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

interface JudgePanelProps {
  open: boolean
  onClose: () => void
}

export default function JudgePanel({ open, onClose }: JudgePanelProps) {
  const [tab, setTab] = useState<Tab>('grade')
  const [answerId, setAnswerId] = useState(ANSWERS[0].id)
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => Object.fromEntries(CRITERIA.map((c) => [c.id, true])))
  const [scale, setScale] = useState<Scale>('0-1')
  const [pinned, setPinned] = useState(false)
  const [bothOrders, setBothOrders] = useState(false)
  const [version, setVersion] = useState<JudgeVersion>('v1')

  useEffect(() => {
    if (!open) return
    setTab('grade'); setAnswerId(ANSWERS[0].id); setScale('0-1'); setPinned(false); setBothOrders(false); setVersion('v1')
    setEnabled(Object.fromEntries(CRITERIA.map((c) => [c.id, true])))
  }, [open])

  const answer = ANSWERS.find((a) => a.id === answerId)!
  const score = rubricScore(answer, enabled)
  const passedWeight = CRITERIA.filter((c) => enabled[c.id] && answer.verdicts[c.id].pass).reduce((s, c) => s + c.weight, 0)
  const totalWeight = CRITERIA.filter((c) => enabled[c.id]).reduce((s, c) => s + c.weight, 0)
  const runs = pinned ? REPEAT_RUNS.pinned : REPEAT_RUNS.unpinned
  const runStats = spread(runs)
  const calib = useMemo(() => agreementWithHumans(JUDGE_VERSIONS[version].verdicts), [version])

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
            <div className="pointer-events-auto w-full max-w-2xl max-h-[calc(100vh-2rem)] flex flex-col bg-gray-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">

              {/* Header + tabs */}
              <div className="px-5 pt-3 border-b border-white/8 shrink-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-[14px] font-semibold text-white">LLM Judge Visualizer</h2>
                    <p className="text-[11px] text-white/40 mt-0.5">How a judge turns a rubric into a score, and how to know if you can trust it</p>
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

                {/* ── Tab 1: grade an answer ─────────────────────────────── */}
                {tab === 'grade' && (
                  <>
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] leading-relaxed" data-section="question">
                      <div className="text-white/80"><span className="text-white/40">Question:</span> “{QUESTION}” <span className="text-white/35">({CONTEXT_NOTE})</span></div>
                      <div className="text-white/80"><span className="text-white/40">Reference:</span> {REFERENCE}</div>
                    </div>

                    <div className="flex flex-col gap-2" data-section="answers">
                      <span className="text-[11px] font-medium text-white/60 uppercase tracking-wider">Answer being judged</span>
                      <div className="flex flex-wrap gap-1.5">
                        {ANSWERS.map((a) => (
                          <Chip key={a.id} active={a.id === answerId} onClick={() => setAnswerId(a.id)} label={`Answer: ${a.label}`}>{a.label}</Chip>
                        ))}
                      </div>
                      <div className="text-[12px] text-white/85 leading-relaxed rounded-lg bg-white/[0.04] px-3 py-2">{answer.text}</div>
                    </div>

                    <div className="flex flex-col gap-1.5" data-section="rubric">
                      <span className="text-[11px] font-medium text-white/60 uppercase tracking-wider">Rubric · the judge’s verdict per criterion</span>
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

                {/* ── Tab 2: consistency and position bias ───────────────── */}
                {tab === 'consistency' && (
                  <>
                    <div className="flex flex-col gap-2" data-section="repeats">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-white/60 uppercase tracking-wider">Same answer, judged 5 times (1–5)</span>
                        <Chip active={pinned} onClick={() => setPinned((p) => !p)} label="Pin the judge"><Pin size={11} className="inline -mt-0.5" /> Pinned model, averaged samples</Chip>
                      </div>
                      <div className="flex items-end gap-3">
                        {runs.map((r, i) => (
                          <div key={i} className="flex flex-col items-center gap-1">
                            <div className="w-10 rounded-md bg-violet-500/60" style={{ height: `${r * 14}px` }} />
                            <span className={`text-[13px] font-semibold tabular-nums ${r >= 4 ? 'text-emerald-300' : 'text-rose-300'}`}>{r}</span>
                            <span className="text-[9px] text-white/30">run {i + 1}</span>
                          </div>
                        ))}
                        <div className="ml-4 text-[11px] text-white/55 leading-relaxed">
                          mean <b className="text-white">{runStats.mean.toFixed(1)}</b> · range {runStats.min}–{runStats.max}
                          <div className="text-white/40">{runStats.min === runStats.max
                            ? 'Stable: the same answer gets the same score every time.'
                            : 'With a pass mark of 4, run 4 fails an answer the other runs pass.'}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 border-t border-white/8 pt-3" data-section="position">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-white/60 uppercase tracking-wider">Pairwise: which answer is better?</span>
                        <Chip active={bothOrders} onClick={() => setBothOrders((b) => !b)} label="Judge both orders">Judge both orders</Chip>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-white/75"><b className="text-white">A</b> · Monthly plans can be cancelled anytime; partial months aren’t refunded. [doc 2]</div>
                        <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-white/75"><b className="text-white">B</b> · You can cancel a monthly plan whenever you like; unused days aren’t refunded. [doc 2]</div>
                      </div>
                      <div className="flex flex-col gap-1 text-[12px]">
                        <div className="text-white/75">Shown <b>A then B</b> → judge picks <b className="text-amber-300">A</b></div>
                        {bothOrders && <div className="text-white/75">Shown <b>B then A</b> → judge picks <b className="text-amber-300">B</b></div>}
                        <div className={`mt-1 rounded-md px-2.5 py-1.5 ${bothOrders ? 'bg-amber-500/15 text-amber-200' : 'bg-white/[0.04] text-white/60'}`} data-verdict>
                          {bothOrders
                            ? 'The winner follows the order, not the answers: position bias. Verdict: tie.'
                            : 'Verdict: A wins. (Judged one way only, so you can’t tell bias from preference.)'}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* ── Tab 3: agreement with human labels ─────────────────── */}
                {tab === 'trust' && (
                  <>
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
                          <span className="flex-1">Answer</span><span>human</span><span>judge</span>
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
                      <div className="col-span-2 text-[10px] text-white/30 text-right">red = the judge disagrees with the human</div>
                    </div>

                    <div className="flex flex-wrap items-start gap-6 border-t border-white/8 pt-3" data-section="agreement">
                      <div data-stat="agreement">
                        <div className="text-[10px] uppercase tracking-wider text-white/40">Agreement</div>
                        <div className="text-[22px] font-bold tabular-nums text-white">{pct(calib.agreement)}</div>
                        <div className="text-[10px] text-white/40">{calib.bothPass + calib.bothFail} of {LABELED.length} match</div>
                      </div>
                      <div data-stat="kappa">
                        <div className="text-[10px] uppercase tracking-wider text-white/40">Cohen’s κ</div>
                        <div className={`text-[22px] font-bold tabular-nums ${calib.kappa >= 0.6 ? 'text-emerald-300' : calib.kappa > 0.2 ? 'text-amber-300' : 'text-rose-300'}`}>{calib.kappa.toFixed(2)}</div>
                        <div className="text-[10px] text-white/40">agreement beyond chance</div>
                      </div>
                      <table className="text-[11px] text-white/70 border-collapse" data-stat="table">
                        <thead>
                          <tr><td /><td className="px-2 text-white/40">judge ✓</td><td className="px-2 text-white/40">judge ✗</td></tr>
                        </thead>
                        <tbody>
                          <tr><td className="pr-2 text-white/40">human ✓</td><td className="px-2 text-center">{calib.bothPass}</td><td className="px-2 text-center text-rose-300">{calib.missed}</td></tr>
                          <tr><td className="pr-2 text-white/40">human ✗</td><td className="px-2 text-center text-rose-300">{calib.falsePass}</td><td className="px-2 text-center">{calib.bothFail}</td></tr>
                        </tbody>
                      </table>
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
