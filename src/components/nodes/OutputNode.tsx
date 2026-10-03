import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function OutputNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config
  const preview = [
    { label: 'to', value: config.destination ?? 'user' },
    { label: 'format', value: config.format ?? 'markdown' },
  ]
  return <BaseNode {...props} preview={preview} />
}
