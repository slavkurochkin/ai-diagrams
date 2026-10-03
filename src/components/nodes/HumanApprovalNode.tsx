import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function HumanApprovalNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config
  const preview = [
    { label: 'via', value: config.channel ?? 'app' },
    { label: 'timeout', value: config.timeoutMinutes ? `${config.timeoutMinutes}m → ${config.onTimeout ?? 'reject'}` : 'none' },
  ]
  return <BaseNode {...props} preview={preview} />
}
