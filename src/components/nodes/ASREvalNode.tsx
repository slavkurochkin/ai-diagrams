import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function ASREvalNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config
  const metrics = [
    config.wer && 'WER',
    config.cer && 'CER',
    config.entityErrorRate && 'entity ER',
  ].filter(Boolean)
  const preview = [
    { label: 'metrics', value: metrics.join(', ') || '—' },
    { label: 'normalise', value: config.normalization ?? 'standard' },
  ]
  return <BaseNode {...props} preview={preview} />
}
