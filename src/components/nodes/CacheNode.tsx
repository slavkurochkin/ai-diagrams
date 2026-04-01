import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function CacheNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config
  const preview = [
    { label: 'strategy', value: config.strategy ?? 'exact' },
    { label: 'ttl', value: config.ttl ?? 3600 },
    { label: 'max entries', value: config.maxSize ?? 1000 },
  ]
  return <BaseNode {...props} preview={preview} />
}
