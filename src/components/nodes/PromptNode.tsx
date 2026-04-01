import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function PromptNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config
  const preview = [
    { label: 'role', value: config.role ?? 'user' },
    { label: 'content', value: config.content ?? '' },
  ]
  return <BaseNode {...props} preview={preview} />
}
