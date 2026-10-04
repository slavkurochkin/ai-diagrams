import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function UserSimulatorNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config
  const preview = [
    { label: 'goal', value: config.goal ?? '' },
    { label: 'turns', value: config.maxTurns ?? 8 },
    { label: 'model', value: config.model ?? '' },
  ]
  return <BaseNode {...props} preview={preview} />
}
