import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function RealtimeVoiceNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config
  const preview = [
    { label: 'model', value: config.model ?? '' },
    { label: 'turns', value: config.turnDetection ?? 'semantic' },
    { label: 'barge-in', value: config.bargeIn === false ? 'off' : 'on' },
  ]
  return <BaseNode {...props} preview={preview} />
}
