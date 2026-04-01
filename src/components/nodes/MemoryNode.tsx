import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function MemoryNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config
  const preview = [
    { label: 'type', value: config.memoryType ?? 'conversation' },
    { label: 'window', value: config.windowSize ?? 10 },
    { label: 'max tokens', value: config.maxTokens ?? 2000 },
  ]
  return <BaseNode {...props} preview={preview} />
}
