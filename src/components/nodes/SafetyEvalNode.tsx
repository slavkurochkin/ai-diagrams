import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function SafetyEvalNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config
  const checks = [
    config.harmfulCompliance && 'harmful',
    config.injectionFollowed && 'injection',
    config.piiLeak && 'pii',
    config.overRefusal && 'over-refusal',
  ].filter(Boolean)
  const preview = [
    { label: 'checks', value: checks.join(', ') || '—' },
    { label: 'judge', value: config.judgeModel ?? '' },
  ]
  return <BaseNode {...props} preview={preview} />
}
