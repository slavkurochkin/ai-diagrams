import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function ThresholdGateNode(props: NodeProps<BaseNodeData>) {
  const c = props.data.config
  return <BaseNode {...props} preview={[
    { label: 'metric', value: c.metric ?? 'score' },
    { label: 'threshold', value: `${c.operator ?? '>='} ${c.threshold ?? 0.7}` },
    { label: 'on fail', value: c.failAction ?? 'route' },
  ]} />
}
