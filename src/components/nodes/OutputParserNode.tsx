import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function OutputParserNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config
  const preview = [
    { label: 'format', value: config.format ?? 'json' },
    { label: 'strict', value: config.strictMode ? 'yes' : 'no' },
  ]
  return <BaseNode {...props} preview={preview} />
}
