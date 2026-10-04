import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function TraceSamplerNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config
  const preview = [
    { label: 'source', value: config.provider ?? 'flow' },
    { label: 'sample', value: `${Math.round(Number(config.sampleRate ?? 0.05) * 100)}%` },
    { label: 'filter', value: config.filter || 'all traffic' },
  ]
  return <BaseNode {...props} preview={preview} />
}
