import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function LLMJudgeNode(props: NodeProps<BaseNodeData>) {
  const c = props.data.config
  return <BaseNode {...props} preview={[
    { label: 'judge', value: c.judgeModel ?? 'gpt-4o' },
    { label: 'scale', value: c.scoringScale ?? '1-5' },
    { label: 'reasoning', value: c.requireReasoning ? 'yes' : 'no' },
  ]} />
}
