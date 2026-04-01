import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function ClassifierNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config
  const preview = [
    { label: 'classes', value: config.classes ?? 'positive, negative, neutral' },
    { label: 'model', value: config.model ?? 'llm' },
    { label: 'threshold', value: config.threshold ?? 0.7 },
  ]
  return <BaseNode {...props} preview={preview} />
}
