import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function RateLimiterNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config
  const preview = [
    { label: 'limit', value: `${config.limit ?? 120} / ${config.window ?? 'minute'}` },
    { label: 'per', value: config.scope ?? 'tenant' },
    { label: 'burst', value: config.burst ?? 20 },
  ]
  return <BaseNode {...props} preview={preview} />
}
