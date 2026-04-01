import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function ToolCallNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config
  const preview = [
    { label: 'tool', value: config.toolName ?? '' },
    { label: 'timeout', value: config.timeout ?? 30 },
    { label: 'retries', value: config.retries ?? 2 },
  ]
  return <BaseNode {...props} preview={preview} />
}
