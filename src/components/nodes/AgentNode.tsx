import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function AgentNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config
  const preview = [
    { label: 'max iter', value: config.maxIterations ?? 10 },
    { label: 'delegate', value: config.allowDelegation ? 'yes' : 'no' },
  ]
  return <BaseNode {...props} preview={preview} />
}
