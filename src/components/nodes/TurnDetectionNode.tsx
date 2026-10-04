import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function TurnDetectionNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config
  const preview = [
    { label: 'mode', value: config.mode === 'vad' ? `vad ${config.silenceMs ?? 500}ms` : config.mode ?? 'semantic' },
    { label: 'barge-in', value: config.bargeIn === false ? 'off' : 'on' },
  ]
  return <BaseNode {...props} preview={preview} />
}
