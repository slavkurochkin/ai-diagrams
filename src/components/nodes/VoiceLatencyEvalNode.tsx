import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function VoiceLatencyEvalNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config
  const metrics = [
    config.timeToFirstAudio && 'TTFA',
    config.turnLatency && 'turn latency',
    config.earlyCutoffs && 'cut-offs',
    config.missedBargeIns && 'missed interrupts',
  ].filter(Boolean)
  const preview = [
    { label: 'metrics', value: metrics.join(', ') || '—' },
    { label: 'budget', value: `${config.percentile ?? 'p95'} ≤ ${config.latencyBudgetMs ?? 800}ms` },
  ]
  return <BaseNode {...props} preview={preview} />
}
