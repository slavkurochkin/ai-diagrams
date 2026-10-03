import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function TriggerNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config
  const preview = [
    { label: 'type', value: config.triggerType ?? 'user-message' },
    { label: 'source', value: config.triggerType === 'schedule' ? config.schedule ?? '' : config.source ?? '' },
  ]
  return <BaseNode {...props} preview={preview} />
}
