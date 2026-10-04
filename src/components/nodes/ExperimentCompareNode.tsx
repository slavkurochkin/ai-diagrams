import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function ExperimentCompareNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config
  const preview = [
    { label: 'metric', value: config.primaryMetric ?? 'score' },
    { label: 'test', value: `${config.test ?? 'bootstrap'} @ ${Number(config.confidence ?? 0.95) * 100}%` },
    { label: 'guard', value: config.guardrailMetrics || '—' },
  ]
  return <BaseNode {...props} preview={preview} />
}
