import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function RerankerNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config
  const preview = [
    { label: 'model', value: config.model ?? 'cohere-rerank-3' },
    { label: 'top n', value: config.topN ?? 3 },
  ]
  return <BaseNode {...props} preview={preview} />
}
