import { motion } from 'framer-motion'
import { formatMs, type LatencyResult, type LatencyStageBudgets, type StageId } from '../../lib/latency'

// Gantt-style waterfall: one row per stage, each bar starting where the previous
// stage ended, a marker for the headline (TTFA / TTFT) and a dashed budget line.
// Shared by the latency visualizer panel and the latency eval nodes' playback overlays.

export const STAGE_COLOR: Record<StageId, string> = {
  networkIn: '#64748B',
  endOfTurn: '#A78BFA',
  sttFinal: '#38BDF8',
  llmTtft: '#F59E0B',
  generation: '#FBBF24',
  ttsTtfb: '#34D399',
  realtimeTtfb: '#2DD4BF',
  networkOut: '#64748B',
  stream: '#475569',
}

interface LatencyWaterfallProps {
  result: LatencyResult
  budgetMs: number
  /** Per-stage budgets; stages over theirs are flagged. */
  stageBudgets?: LatencyStageBudgets
  compact?: boolean
  /** Bars grow in one after another (playback). */
  animate?: boolean
}

export default function LatencyWaterfall({ result, budgetMs, stageBudgets = {}, compact = false, animate = false }: LatencyWaterfallProps) {
  const scale = Math.max(result.totalMs, budgetMs, 1) * 1.08
  const pct = (ms: number) => `${(ms / scale) * 100}%`
  const labelW = compact ? 'w-24' : 'w-44'
  const text = compact ? 'text-[9px]' : 'text-[11px]'
  const rowH = compact ? 'h-3' : 'h-4'
  const visible = result.segments.filter((s) => s.durationMs > 0)
  const stagger = animate ? Math.min(0.25, 1.2 / Math.max(1, visible.length)) : 0

  return (
    <div className="flex flex-col gap-1">
      {visible.map((seg, i) => {
        const limit = stageBudgets[seg.id]
        const over = limit !== undefined && seg.durationMs > limit
        return (
          <div key={seg.id} className="flex items-center gap-2" title={limit !== undefined ? `${seg.label}: ${formatMs(seg.durationMs)} (budget ${formatMs(limit)})` : seg.label}>
            <span className={`${labelW} shrink-0 truncate ${text} ${seg.critical ? 'text-white/60' : 'text-white/35'}`}>{seg.label}</span>
            <div className={`relative flex-1 ${rowH}`}>
              {/* Budget line */}
              <div className="absolute inset-y-[-3px] border-l border-dashed border-rose-400/60" style={{ left: pct(budgetMs) }} />
              <motion.div
                className={`absolute inset-y-0 rounded-sm ${over ? 'ring-1 ring-rose-400' : ''}`}
                style={{
                  left: pct(seg.startMs),
                  background: STAGE_COLOR[seg.id],
                  opacity: seg.critical ? 0.9 : 0.35,
                  transformOrigin: 'left',
                }}
                initial={animate ? { width: 0 } : false}
                animate={{ width: pct(seg.durationMs) }}
                transition={{ duration: animate ? 0.35 : 0, delay: i * stagger, ease: 'easeOut' }}
              />
            </div>
            <span className={`w-14 shrink-0 text-right tabular-nums ${text} ${over ? 'text-rose-300 font-semibold' : 'text-white/55'}`}>
              {formatMs(seg.durationMs)}
            </span>
          </div>
        )
      })}
      <div className="flex items-center gap-2 pt-1">
        <span className={`${labelW} shrink-0 ${text} font-semibold ${result.overBudget ? 'text-rose-300' : 'text-emerald-300'}`}>
          {result.headlineLabel}
        </span>
        <div className={`relative flex-1 ${rowH}`}>
          <div className="absolute inset-y-[-3px] border-l border-dashed border-rose-400/60" style={{ left: pct(budgetMs) }} />
          <div
            className={`absolute inset-y-0 left-0 rounded-sm ${result.overBudget ? 'bg-rose-500/40' : 'bg-emerald-500/35'}`}
            style={{ width: pct(result.headlineMs) }}
          />
        </div>
        <span className={`w-14 shrink-0 text-right tabular-nums ${text} font-semibold ${result.overBudget ? 'text-rose-300' : 'text-emerald-300'}`}>
          {formatMs(result.headlineMs)}
        </span>
      </div>
    </div>
  )
}

/** Budgets configured on a Voice Latency node, keyed by stage. */
export function stageBudgetsFromConfig(config: Record<string, unknown>): LatencyStageBudgets {
  if (config.stageBreakdown === false) return {}
  const n = (k: string) => (typeof config[k] === 'number' ? (config[k] as number) : undefined)
  const network = n('networkBudgetMs')
  const entries: [StageId, number | undefined][] = [
    ['networkIn', network],
    ['endOfTurn', n('endOfTurnBudgetMs')],
    ['sttFinal', n('sttBudgetMs')],
    ['llmTtft', n('llmTtftBudgetMs')],
    ['ttsTtfb', n('ttsTtfbBudgetMs')],
    ['networkOut', network],
  ]
  return Object.fromEntries(entries.filter(([, v]) => v !== undefined)) as LatencyStageBudgets
}
