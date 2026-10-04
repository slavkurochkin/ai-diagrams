import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import LatencyWaterfall, { stageBudgetsFromConfig } from './LatencyWaterfall'
import {
  computeLatency,
  DEFAULT_TEXT_TIMINGS,
  DEFAULT_VOICE_TIMINGS,
  formatMs,
  parseTimings,
  type LatencyTimings,
  type PresetKind,
} from '../../lib/latency'

/** A latency node's example timings, with the budget taken from the node's own budget field. */
export function exampleTimingsFromConfig(config: Record<string, unknown>, kind: PresetKind): LatencyTimings {
  const fallback = kind === 'text' ? DEFAULT_TEXT_TIMINGS : DEFAULT_VOICE_TIMINGS
  const timings = parseTimings(config.exampleTimings, fallback)
  const budget = kind === 'text' ? config.ttftBudgetMs : config.latencyBudgetMs
  return typeof budget === 'number' ? { ...timings, budgetMs: budget } : timings
}

interface LatencyOverlayProps {
  config: Record<string, unknown>
  kind: PresetKind
  animState: string
  layoutDirection: string
}

/** Playback card on the latency eval nodes: the waterfall fills in stage by stage. */
export default function LatencyOverlay({ config, kind, animState, layoutDirection }: LatencyOverlayProps) {
  const timings = useMemo(() => exampleTimingsFromConfig(config, kind), [config, kind])
  const result = useMemo(() => computeLatency(timings), [timings])
  const stageBudgets = kind === 'voice' ? stageBudgetsFromConfig(config) : {}
  const isDone = animState === 'done'

  // Mirror BaseNode note card convention: TB → right, LR → below
  const overlayPos = layoutDirection === 'LR'
    ? { top: 'calc(100% + 12px)', left: 0, width: 300 }
    : { top: 0, left: 'calc(100% + 16px)', width: 300 }

  return (
    <motion.div
      className="absolute pointer-events-none z-50"
      style={overlayPos}
      initial={layoutDirection === 'LR' ? { opacity: 0, y: 6 } : { opacity: 0, x: 6 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <div className="rounded-xl border border-violet-500/30 shadow-2xl overflow-hidden bg-gray-950/90 backdrop-blur-md">
        <div className="h-0.5 bg-gradient-to-r from-violet-500 to-transparent" />
        <div className="px-3 py-2.5 space-y-2">
          <p className="text-[10px] font-semibold text-violet-300 uppercase tracking-wider">
            {kind === 'text' ? 'Where response time goes' : 'Where time to first audio goes'}
          </p>
          <LatencyWaterfall result={result} budgetMs={timings.budgetMs} stageBudgets={stageBudgets} compact animate />
          <AnimatePresence>
            {isDone && result.biggest && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden text-[10px] text-white/55 pt-1.5 border-t border-white/[0.07]"
              >
                {result.overBudget ? 'Over' : 'Within'} the {formatMs(timings.budgetMs)} budget — biggest piece:{' '}
                <span className="text-white/80">{result.biggest.label}</span> ({formatMs(result.biggest.durationMs)})
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
