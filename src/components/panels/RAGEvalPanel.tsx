import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Ban, HelpCircle } from 'lucide-react'

// ── Metric computation ─────────────────────────────────────────────────────────

function computeMetrics(retrieved: boolean[], totalRelevant: number) {
  const k = retrieved.length
  const tp = retrieved.filter(Boolean).length // true positives

  const precision = k === 0 ? 0 : tp / k
  const recall = totalRelevant === 0 ? 0 : Math.min(tp / totalRelevant, 1)

  // MRR — reciprocal rank of FIRST relevant result
  const firstIdx = retrieved.indexOf(true)
  const mrr = firstIdx === -1 ? 0 : 1 / (firstIdx + 1)

  // NDCG@k
  const dcg = retrieved.reduce((acc, rel, i) => acc + (rel ? 1 / Math.log2(i + 2) : 0), 0)
  const idealHits = Math.min(k, totalRelevant)
  const idcg = Array.from({ length: idealHits }, (_, i) => 1 / Math.log2(i + 2)).reduce(
    (a, b) => a + b,
    0,
  )
  const ndcg = idcg === 0 ? 0 : dcg / idcg

  return { precision, recall, mrr, ndcg, tp }
}

// ── Progress bar ───────────────────────────────────────────────────────────────

function MetricBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden w-full">
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${value * 100}%` }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      />
    </div>
  )
}

// ── Numeric stepper ────────────────────────────────────────────────────────────

function Stepper({
  label, value, min, max, onChange,
}: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-white/40 uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-6 h-6 rounded flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-colors text-sm font-bold"
        >−</button>
        <span className="w-7 text-center text-[14px] font-semibold text-white tabular-nums">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-6 h-6 rounded flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-colors text-sm font-bold"
        >+</button>
      </div>
    </div>
  )
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface RAGEvalPanelProps {
  open: boolean
  onClose: () => void
  initialK?: number
}

// ── Main panel ─────────────────────────────────────────────────────────────────

export default function RAGEvalPanel({ open, onClose, initialK = 5 }: RAGEvalPanelProps) {
  const [k, setK] = useState(Math.max(1, Math.min(20, initialK)))
  const [totalRelevant, setTotalRelevant] = useState(8)

  // retrieved[i] = true means rank (i+1) document is relevant
  const [retrieved, setRetrieved] = useState<boolean[]>(() =>
    Array.from({ length: initialK }, (_, i) => i < 3), // default: first 3 relevant
  )

  // Sync retrieved array length when k changes
  const handleSetK = useCallback((newK: number) => {
    setK(newK)
    setRetrieved((prev) => {
      if (newK > prev.length) return [...prev, ...Array(newK - prev.length).fill(false)]
      return prev.slice(0, newK)
    })
  }, [])

  const toggleDoc = useCallback((idx: number) => {
    setRetrieved((prev) => prev.map((v, i) => (i === idx ? !v : v)))
  }, [])

  const metrics = useMemo(
    () => computeMetrics(retrieved, totalRelevant),
    [retrieved, totalRelevant],
  )

  const missed = Math.max(0, totalRelevant - metrics.tp)

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="rag-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            key="rag-panel"
            initial={{ opacity: 0, scale: 0.97, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-2xl max-h-[90vh] flex flex-col bg-gray-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">

              {/* Header */}
              <div className="flex items-start justify-between px-5 py-4 border-b border-white/8 shrink-0">
                <div>
                  <h2 className="text-[14px] font-semibold text-white">RAG Evaluation Visualizer</h2>
                  <p className="text-[11px] text-white/40 mt-0.5">
                    Toggle retrieved chunks to see how Precision@K, Recall@K, MRR and NDCG@K change
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0 p-5 flex flex-col gap-6">

                {/* Controls */}
                <div className="flex items-end gap-8">
                  <Stepper label="K  (retrieved)" value={k} min={1} max={20} onChange={handleSetK} />
                  <Stepper
                    label="Total relevant in corpus"
                    value={totalRelevant}
                    min={metrics.tp}
                    max={100}
                    onChange={setTotalRelevant}
                  />
                  <button
                    type="button"
                    onClick={() => setRetrieved(Array(k).fill(false))}
                    className="mb-0.5 text-[11px] text-white/30 hover:text-white/60 transition-colors"
                  >
                    reset
                  </button>
                </div>

                {/* Retrieved docs */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-white/60 uppercase tracking-wider">
                      Retrieved chunks / docs
                    </span>
                    <span className="text-[10px] text-white/30">— click to toggle relevance</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {retrieved.map((rel, i) => (
                      <motion.button
                        key={i}
                        type="button"
                        onClick={() => toggleDoc(i)}
                        whileHover={{ scale: 1.06 }}
                        whileTap={{ scale: 0.94 }}
                        className={`
                          relative flex flex-col items-center gap-1 w-14
                          rounded-xl px-1 py-2
                          border transition-all duration-150 cursor-pointer
                          ${rel
                            ? 'bg-emerald-900/50 border-emerald-500/50 text-emerald-300'
                            : 'bg-rose-900/30 border-rose-700/40 text-rose-400'
                          }
                        `}
                        title={rel ? 'Relevant — click to mark as not relevant' : 'Not relevant — click to mark as relevant'}
                      >
                        <span className="text-[10px] text-white/40 font-medium">#{i + 1}</span>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{
                            background: rel ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.15)',
                          }}
                        >
                          {rel
                            ? <Check size={14} className="text-emerald-400" />
                            : <Ban size={14} className="text-rose-500" />
                          }
                        </div>
                        <span className="text-[9px] font-medium leading-none">
                          {rel ? 'relevant' : 'not rel.'}
                        </span>
                        {/* Rank badge — shows position for MRR intuition */}
                        {rel && i === retrieved.indexOf(true) && (
                          <span className="absolute -top-1.5 -right-1.5 text-[8px] bg-amber-500 text-black font-bold px-1 rounded-full">
                            1st
                          </span>
                        )}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Missed relevant docs */}
                {missed > 0 && (
                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-medium text-white/40 uppercase tracking-wider">
                      Relevant docs missed  <span className="text-white/25 normal-case font-normal">
                        ({missed} of {totalRelevant} relevant docs not retrieved)
                      </span>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: Math.min(missed, 20) }, (_, i) => (
                        <div
                          key={i}
                          className="flex flex-col items-center gap-1 w-14 rounded-xl px-1 py-2 border border-dashed border-white/15"
                        >
                          <span className="text-[10px] text-white/20 font-medium">M{i + 1}</span>
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/5">
                            <HelpCircle size={13} className="text-white/20" />
                          </div>
                          <span className="text-[9px] text-white/20 leading-none">missed</span>
                        </div>
                      ))}
                      {missed > 20 && (
                        <div className="flex items-center text-[11px] text-white/20 px-2">
                          +{missed - 20} more
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Divider */}
                <div className="h-px bg-white/8" />

                {/* Metrics table */}
                <div className="flex flex-col gap-4">
                  <span className="text-[11px] font-medium text-white/60 uppercase tracking-wider">Metrics</span>

                  {[
                    {
                      name: `Precision@${k}`,
                      value: metrics.precision,
                      fraction: `${metrics.tp} / ${k}`,
                      color: '#10B981',
                      explain: `${metrics.tp} of ${k} retrieved chunks are relevant`,
                    },
                    {
                      name: `Recall@${k}`,
                      value: metrics.recall,
                      fraction: `${metrics.tp} / ${totalRelevant}`,
                      color: '#3B82F6',
                      explain: `Found ${metrics.tp} of ${totalRelevant} relevant docs in corpus`,
                    },
                    {
                      name: 'MRR',
                      value: metrics.mrr,
                      fraction: retrieved.indexOf(true) === -1
                        ? '–'
                        : `1 / ${retrieved.indexOf(true) + 1}`,
                      color: '#F59E0B',
                      explain: retrieved.indexOf(true) === -1
                        ? 'No relevant result retrieved'
                        : `First relevant result at rank ${retrieved.indexOf(true) + 1}`,
                    },
                    {
                      name: `NDCG@${k}`,
                      value: metrics.ndcg,
                      fraction: metrics.ndcg.toFixed(3),
                      color: '#8B5CF6',
                      explain: 'Penalises relevant results appearing at lower ranks',
                    },
                  ].map(({ name, value, fraction, color, explain }) => (
                    <div key={name} className="flex flex-col gap-1.5">
                      <div className="flex items-baseline justify-between gap-4">
                        <div className="flex items-baseline gap-3">
                          <span className="text-[13px] font-semibold text-white w-28 shrink-0">{name}</span>
                          <span className="text-[11px] text-white/40">{explain}</span>
                        </div>
                        <div className="flex items-baseline gap-2 shrink-0">
                          <span className="text-[11px] text-white/40 tabular-nums">{fraction}</span>
                          <span
                            className="text-[16px] font-bold tabular-nums w-12 text-right"
                            style={{ color }}
                          >
                            {(value * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <MetricBar value={value} color={color} />
                    </div>
                  ))}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-5 text-[10px] text-white/30 border-t border-white/8 pt-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-emerald-500/50 border border-emerald-500/60" />
                    Relevant &amp; retrieved
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-rose-500/30 border border-rose-600/50" />
                    Not relevant (false positive)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded border border-dashed border-white/20" />
                    Relevant but missed (false negative)
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
