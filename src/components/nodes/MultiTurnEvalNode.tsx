import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function MultiTurnEvalNode(props: NodeProps<BaseNodeData>) {
  const c = props.data.config
  const metrics = [
    c.coherence       && 'Coherence',
    c.goalProgress    && 'Goal Progress',
    c.consistency     && 'Consistency',
    c.contextRetention && 'Ctx Retention',
  ].filter(Boolean).join(', ') || '—'

  const window = (c.turnWindow ?? 0) === 0 ? 'full' : `last ${c.turnWindow}`

  return <BaseNode {...props} preview={[
    { label: 'metrics', value: metrics },
    { label: 'window',  value: window },
    { label: 'judge',   value: String(c.judgeModel ?? 'gpt-4o').split('/').pop()! },
  ]} />
}
