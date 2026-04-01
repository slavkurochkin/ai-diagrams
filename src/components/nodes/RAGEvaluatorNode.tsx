import { motion, AnimatePresence } from 'framer-motion'
import type { NodeProps } from 'reactflow'
import { useFlowStore } from '../../hooks/useFlowStore'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

// Deterministic relevance pattern — gives precision ≈ 60%, MRR = 1.0
const MOCK = [true, false, true, true, false, false, true, false, true, true, false, true]

// ── Inline eval overlay ────────────────────────────────────────────────────────

interface OverlayProps {
  animState: string
  k: number
  layoutDirection: string
}

function EvalOverlay({ animState, k, layoutDirection }: OverlayProps) {
  const displayK = Math.min(k, 12)
  const retrieved = Array.from({ length: displayK }, (_, i) => MOCK[i % MOCK.length])
  const extra = k - displayK

  const tp = retrieved.filter(Boolean).length
  const totalRelevant = Math.max(tp + 2, Math.round(k * 0.8))
  const precision = displayK === 0 ? 0 : tp / displayK
  const recall = Math.min(tp / totalRelevant, 1)
  const firstIdx = retrieved.indexOf(true)
  const mrr = firstIdx === -1 ? 0 : 1 / (firstIdx + 1)
  const isDone = animState === 'done'

  // Mirror BaseNode note card convention: TB → right, LR → below
  const overlayPos = layoutDirection === 'LR'
    ? { top: 'calc(100% + 12px)', left: 0, width: 244 }
    : { top: 0, left: 'calc(100% + 16px)', width: 244 }

  const initAnim = layoutDirection === 'LR'
    ? { opacity: 0, y: 6 }
    : { opacity: 0, x: 6 }

  const stagger = Math.max(0.06, 0.9 / displayK)

  return (
    <motion.div
      className="absolute pointer-events-none z-50"
      style={overlayPos}
      initial={initAnim}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <div className="rounded-xl border border-cyan-500/30 shadow-2xl overflow-hidden bg-gray-950/90 backdrop-blur-md">
        {/* Accent line */}
        <div className="h-0.5 bg-gradient-to-r from-cyan-500 to-transparent" />

        <div className="px-3 py-2.5 space-y-2.5">

          {/* Header */}
          <p className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider">
            {isDone
              ? `Results · ${tp} / ${displayK} relevant`
              : `Evaluating ${k} chunk${k !== 1 ? 's' : ''}…`}
          </p>

          {/* Retrieved chunk chips */}
          <div className="flex flex-wrap gap-1">
            {retrieved.map((rel, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * stagger, duration: 0.18, ease: 'easeOut' }}
                className={`
                  flex items-center justify-center w-8 h-6 rounded-md
                  border text-[9px] font-bold
                  ${rel
                    ? 'bg-emerald-900/60 border-emerald-500/50 text-emerald-300'
                    : 'bg-rose-900/40 border-rose-600/30 text-rose-400/70'
                  }
                `}
              >
                #{i + 1}
              </motion.div>
            ))}
            {extra > 0 && (
              <div className="flex items-center text-[9px] text-white/25 px-1">
                +{extra}
              </div>
            )}
          </div>

          {/* Metrics — appear when done */}
          <AnimatePresence>
            {isDone && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="overflow-hidden pt-2 border-t border-white/[0.07] space-y-1.5"
              >
                {[
                  { label: `P@${k}`, value: precision, color: '#10B981' },
                  { label: `R@${k}`, value: recall,    color: '#3B82F6' },
                  { label: 'MRR',    value: mrr,        color: '#F59E0B' },
                ].map(({ label, value, color }, idx) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="text-[9px] text-white/35 w-9 shrink-0 font-mono">{label}</span>
                    <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${value * 100}%` }}
                        transition={{ duration: 0.45, ease: 'easeOut', delay: 0.08 + idx * 0.1 }}
                      />
                    </div>
                    <span
                      className="text-[10px] font-bold tabular-nums w-8 text-right"
                      style={{ color }}
                    >
                      {(value * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </motion.div>
  )
}

// ── RAGEvaluatorNode ───────────────────────────────────────────────────────────

export default function RAGEvaluatorNode(props: NodeProps<BaseNodeData>) {
  const layoutDirection = useFlowStore((s) => s.layoutDirection)
  const c = props.data.config
  const k = Math.max(1, Math.min(20, Number(c.k ?? 5)))
  const animState = props.data.animationState ?? 'idle'

  const retrieval = [
    c.recallAtK    && `Recall@${c.k ?? 5}`,
    c.precisionAtK && `Precision@${c.k ?? 5}`,
    c.mrr          && 'MRR',
    c.ndcgAtK      && `NDCG@${c.k ?? 5}`,
  ].filter(Boolean).join(', ') || '—'

  const generation = [
    c.faithfulness     && 'Faithfulness',
    c.answerRelevancy  && 'Answer Rel.',
    c.contextPrecision && 'Ctx Precision',
    c.contextRecall    && 'Ctx Recall',
  ].filter(Boolean).join(', ') || '—'

  return (
    <div className="relative" style={{ width: 220 }}>
      <BaseNode
        {...props}
        preview={[
          { label: 'retrieval',  value: retrieval },
          { label: 'generation', value: generation },
          { label: 'k',          value: c.k ?? 5 },
        ]}
      />

      <AnimatePresence>
        {(animState === 'processing' || animState === 'done') && (
          <EvalOverlay
            key="eval-overlay"
            animState={animState}
            k={k}
            layoutDirection={layoutDirection}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
