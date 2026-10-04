import { AnimatePresence } from 'framer-motion'
import type { NodeProps } from 'reactflow'
import { useFlowStore } from '../../hooks/useFlowStore'
import BaseNode from './base/BaseNode'
import LatencyOverlay from '../latency/LatencyOverlay'
import type { BaseNodeData } from '../../types/nodes'

export default function ResponseLatencyEvalNode(props: NodeProps<BaseNodeData>) {
  const layoutDirection = useFlowStore((s) => s.layoutDirection)
  const config = props.data.config
  const animState = props.data.animationState ?? 'idle'
  const metrics = [
    config.ttft && 'TTFT',
    config.tokensPerSecond && 'tokens/s',
    config.totalLatency && 'total',
  ].filter(Boolean)
  const preview = [
    { label: 'metrics', value: metrics.join(', ') || '—' },
    { label: 'budget', value: `${config.percentile ?? 'p95'} TTFT ≤ ${config.ttftBudgetMs ?? 800}ms` },
  ]
  return (
    <div className="relative" style={{ width: 220 }}>
      <BaseNode {...props} preview={preview} />
      <AnimatePresence>
        {(animState === 'processing' || animState === 'done') && (
          <LatencyOverlay key="latency-overlay" config={config} kind="text" animState={animState} layoutDirection={layoutDirection} />
        )}
      </AnimatePresence>
    </div>
  )
}
