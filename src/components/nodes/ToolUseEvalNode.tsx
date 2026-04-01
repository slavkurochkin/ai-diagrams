import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function ToolUseEvalNode(props: NodeProps<BaseNodeData>) {
  const c = props.data.config
  const checks = [
    c.toolSelection      && 'Selection',
    c.argumentCorrectness && 'Args',
    c.orderMatters       && 'Order',
    c.redundantCalls     && 'Redundancy',
  ].filter(Boolean).join(', ') || '—'

  return <BaseNode {...props} preview={[
    { label: 'checks',   value: checks },
    { label: 'matching', value: String(c.matchStrategy ?? 'exact') },
  ]} />
}
