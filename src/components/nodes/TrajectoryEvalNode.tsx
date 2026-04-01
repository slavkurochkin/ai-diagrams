import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function TrajectoryEvalNode(props: NodeProps<BaseNodeData>) {
  const c = props.data.config
  return <BaseNode {...props} preview={[
    { label: 'strategy',      value: String(c.strategy ?? 'llm') },
    { label: 'terminal wt',   value: c.terminalStateWeight ?? 0.5 },
    { label: 'extra steps',   value: c.stepEfficiency ? 'penalised' : 'ignored' },
  ]} />
}
