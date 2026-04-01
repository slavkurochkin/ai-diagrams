import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function HumanRaterNode(props: NodeProps<BaseNodeData>) {
  const c = props.data.config
  return <BaseNode {...props} preview={[
    { label: 'scale', value: c.ratingScale ?? '1-5' },
    { label: 'interface', value: c.interface ?? 'form' },
    { label: 'feedback', value: c.requireFeedback ? 'required' : 'optional' },
  ]} />
}
