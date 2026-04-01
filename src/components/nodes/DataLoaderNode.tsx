import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function DataLoaderNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config
  const preview = [
    { label: 'source', value: config.source ?? 'file' },
    { label: 'path', value: config.path ?? '' },
    { label: 'recursive', value: config.recursive ? 'yes' : 'no' },
  ]
  return <BaseNode {...props} preview={preview} />
}
