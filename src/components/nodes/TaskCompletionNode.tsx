import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function TaskCompletionNode(props: NodeProps<BaseNodeData>) {
  const c = props.data.config
  return <BaseNode {...props} preview={[
    { label: 'type',    value: String(c.completionType ?? 'graded') },
    { label: 'partial', value: c.allowPartialCredit ? 'yes' : 'no' },
    { label: 'judge',   value: String(c.judgeModel ?? 'gpt-4o').split('/').pop()! },
  ]} />
}
