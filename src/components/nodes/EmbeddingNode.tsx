import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function EmbeddingNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config
  const preview = [
    { label: 'model', value: config.model ?? 'text-embedding-3-small' },
    { label: 'dims', value: config.dimensions ?? 1536 },
    { label: 'normalize', value: config.normalize ? 'yes' : 'no' },
  ]
  return <BaseNode {...props} preview={preview} />
}
