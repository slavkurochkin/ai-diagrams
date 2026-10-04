import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { NodeProps } from 'reactflow'
import { useFlowStore } from '../../hooks/useFlowStore'
import BaseNode from './base/BaseNode'
import WerAlignment from '../wer/WerAlignment'
import { computeWer, formatRate, parseEntities, type Normalization } from '../../lib/wer'
import type { BaseNodeData } from '../../types/nodes'

// ── Playback overlay: the node's example alignment and its WER ────────────────

interface OverlayProps {
  config: BaseNodeData['config']
  animState: string
  layoutDirection: string
}

function WerOverlay({ config, animState, layoutDirection }: OverlayProps) {
  const result = useMemo(
    () =>
      computeWer(String(config.sampleReference ?? ''), String(config.sampleTranscript ?? ''), {
        normalization: (config.normalization as Normalization) ?? 'standard',
        entities: parseEntities(String(config.sampleEntities ?? '')),
      }),
    [config.sampleReference, config.sampleTranscript, config.sampleEntities, config.normalization],
  )
  const isDone = animState === 'done'

  // Mirror BaseNode note card convention: TB → right, LR → below
  const overlayPos = layoutDirection === 'LR'
    ? { top: 'calc(100% + 12px)', left: 0, width: 280 }
    : { top: 0, left: 'calc(100% + 16px)', width: 280 }

  const errors = result.substitutions + result.deletions + result.insertions

  return (
    <motion.div
      className="absolute pointer-events-none z-50"
      style={overlayPos}
      initial={layoutDirection === 'LR' ? { opacity: 0, y: 6 } : { opacity: 0, x: 6 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <div className="rounded-xl border border-amber-500/30 shadow-2xl overflow-hidden bg-gray-950/90 backdrop-blur-md">
        <div className="h-0.5 bg-gradient-to-r from-amber-500 to-transparent" />
        <div className="px-3 py-2.5 space-y-2.5">
          <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
            {isDone ? `Aligned · ${errors} edit${errors === 1 ? '' : 's'} in ${result.refLength} words` : 'Aligning words…'}
          </p>

          <WerAlignment ops={result.ops} compact animate />

          <AnimatePresence>
            {isDone && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="overflow-hidden pt-2 border-t border-white/[0.07] space-y-1"
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] text-white/50 font-mono">
                    WER = ({result.substitutions} + {result.deletions} + {result.insertions}) / {result.refLength}
                  </span>
                  <span className="text-[13px] font-bold tabular-nums text-amber-300">{formatRate(result.wer)}</span>
                </div>
                {result.entityErrorRate !== null && (
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] text-white/50">
                      Entity errors ({result.entities.filter((e) => e.found && !e.correct).length} of{' '}
                      {result.entities.filter((e) => e.found).length})
                    </span>
                    <span className="text-[12px] font-bold tabular-nums text-rose-300">{formatRate(result.entityErrorRate)}</span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

// ── ASREvalNode ───────────────────────────────────────────────────────────────

export default function ASREvalNode(props: NodeProps<BaseNodeData>) {
  const layoutDirection = useFlowStore((s) => s.layoutDirection)
  const config = props.data.config
  const animState = props.data.animationState ?? 'idle'
  const metrics = [
    config.wer && 'WER',
    config.cer && 'CER',
    config.entityErrorRate && 'entity ER',
  ].filter(Boolean)
  const preview = [
    { label: 'metrics', value: metrics.join(', ') || '—' },
    { label: 'normalise', value: config.normalization ?? 'standard' },
  ]
  const hasExample = Boolean(String(config.sampleReference ?? '').trim())

  return (
    <div className="relative" style={{ width: 220 }}>
      <BaseNode {...props} preview={preview} />
      <AnimatePresence>
        {hasExample && (animState === 'processing' || animState === 'done') && (
          <WerOverlay key="wer-overlay" config={config} animState={animState} layoutDirection={layoutDirection} />
        )}
      </AnimatePresence>
    </div>
  )
}
