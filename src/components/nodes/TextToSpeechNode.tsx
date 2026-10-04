import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function TextToSpeechNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config
  const preview = [
    { label: 'model', value: config.model ?? '' },
    { label: 'voice', value: config.voice || 'default' },
    { label: 'format', value: config.format ?? 'pcm16' },
  ]
  return <BaseNode {...props} preview={preview} />
}
