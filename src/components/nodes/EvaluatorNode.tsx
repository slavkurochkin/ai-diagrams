import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function EvaluatorNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config
  const preview = [
    { label: 'metric', value: config.metric ?? 'faithfulness' },
    { label: 'threshold', value: config.threshold ?? 0.8 },
  ]
  return <BaseNode {...props} preview={preview} />
}
