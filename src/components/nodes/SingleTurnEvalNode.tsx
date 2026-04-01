import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function SingleTurnEvalNode(props: NodeProps<BaseNodeData>) {
  const c = props.data.config
  const metrics = [
    c.relevance    && 'Relevance',
    c.correctness  && 'Correctness',
    c.helpfulness  && 'Helpfulness',
    c.harmlessness && 'Harmlessness',
  ].filter(Boolean).join(', ') || '—'

  return <BaseNode {...props} preview={[
    { label: 'metrics', value: metrics },
    { label: 'scale',   value: c.scale ?? '1-5' },
    { label: 'judge',   value: String(c.judgeModel ?? 'gpt-4o').split('/').pop()! },
  ]} />
}
