import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function ChunkerNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config
  const preview = [
    { label: 'strategy', value: config.strategy ?? 'fixed' },
    { label: 'chunk', value: config.chunkSize ?? 512 },
    { label: 'overlap', value: config.overlap ?? 64 },
  ]
  return <BaseNode {...props} preview={preview} />
}
