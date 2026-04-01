import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function WebSearchNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config
  const preview = [
    { label: 'engine', value: config.engine ?? 'brave' },
    { label: 'max results', value: config.maxResults ?? 5 },
  ]
  return <BaseNode {...props} preview={preview} />
}
