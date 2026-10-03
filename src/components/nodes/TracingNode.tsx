import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function TracingNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config
  const preview = [
    { label: 'provider', value: config.provider ?? 'opentelemetry' },
    { label: 'scope', value: config.scope === 'frame' ? 'this frame' : 'whole flow' },
    { label: 'sample', value: `${Math.round(Number(config.sampleRate ?? 1) * 100)}%` },
  ]
  return <BaseNode {...props} preview={preview} />
}
