import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function SpeechToTextNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config
  const preview = [
    { label: 'model', value: config.model ?? '' },
    { label: 'mode', value: config.streaming === false ? 'batch' : 'streaming' },
    { label: 'lang', value: config.language || 'auto' },
  ]
  return <BaseNode {...props} preview={preview} />
}
