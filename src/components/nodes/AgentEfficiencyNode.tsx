import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function AgentEfficiencyNode(props: NodeProps<BaseNodeData>) {
  const c = props.data.config
  const tracking = [
    c.trackSteps     && 'Steps',
    c.trackToolCalls && 'Tool Calls',
    c.trackTokens    && 'Tokens',
    c.trackCost      && 'Cost',
  ].filter(Boolean).join(', ') || '—'

  return <BaseNode {...props} preview={[
    { label: 'tracking', value: tracking },
    { label: 'budget',   value: c.trackCost ? `$${c.budgetThreshold ?? 0.1}` : 'off' },
  ]} />
}
