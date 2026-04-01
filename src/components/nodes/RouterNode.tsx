import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function RouterNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config
  const preview = [
    { label: 'condition', value: config.conditionType ?? 'llm' },
    { label: 'rule', value: config.condition ?? '' },
  ]
  return <BaseNode {...props} preview={preview} />
}
