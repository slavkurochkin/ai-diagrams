import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function ComparatorNode(props: NodeProps<BaseNodeData>) {
  const c = props.data.config
  return <BaseNode {...props} preview={[
    { label: 'judge', value: c.judgeModel ?? 'gpt-4o' },
    { label: 'swap bias', value: c.positionBias ? 'yes' : 'no' },
  ]} />
}
