import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function SubAgentNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config
  const preview = [
    { label: 'model', value: config.model ?? 'claude-haiku-4-5' },
    { label: 'returns', value: config.returnMode ?? 'summary' },
  ]
  return <BaseNode {...props} preview={preview} />
}
