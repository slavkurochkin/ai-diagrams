import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function GuardrailsNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config
  const preview = [
    { label: 'checks', value: config.checks ?? 'toxicity, pii' },
    { label: 'action', value: config.action ?? 'block' },
  ]
  return <BaseNode {...props} preview={preview} />
}
