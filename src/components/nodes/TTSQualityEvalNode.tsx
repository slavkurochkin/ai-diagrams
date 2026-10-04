import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function TTSQualityEvalNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config
  const metrics = [
    config.mos && 'MOS',
    config.intelligibility && 'round-trip WER',
    config.entityPronunciation && 'pronunciation',
  ].filter(Boolean)
  const preview = [
    { label: 'metrics', value: metrics.join(', ') || '—' },
  ]
  return <BaseNode {...props} preview={preview} />
}
