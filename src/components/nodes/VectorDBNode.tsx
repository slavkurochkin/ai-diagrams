import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData, VectorDBNodeConfig } from '../../types/nodes'

export default function VectorDBNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config as unknown as VectorDBNodeConfig

  const preview = [
    { label: 'provider', value: config.provider ?? 'pinecone' },
    { label: 'index', value: config.indexName || '(not set)' },
    { label: 'top-k', value: config.topK ?? 5 },
  ]

  return <BaseNode {...props} preview={preview} />
}
