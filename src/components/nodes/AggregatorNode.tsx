import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function AggregatorNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config
  const preview = [
    { label: 'strategy', value: config.strategy ?? 'concat' },
    { label: 'separator', value: config.separator ?? '\\n\\n' },
  ]
  return <BaseNode {...props} preview={preview} />
}
