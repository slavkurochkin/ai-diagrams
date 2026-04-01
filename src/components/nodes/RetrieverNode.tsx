import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function RetrieverNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config
  const preview = [
    { label: 'strategy', value: config.strategy ?? 'similarity' },
    { label: 'top k', value: config.topK ?? 5 },
  ]
  return <BaseNode {...props} preview={preview} />
}
