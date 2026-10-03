import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import { DEFAULT_JUDGE_MODEL } from '../../lib/modelCatalog'
import type { BaseNodeData } from '../../types/nodes'

export default function ComparatorNode(props: NodeProps<BaseNodeData>) {
  const c = props.data.config
  return <BaseNode {...props} preview={[
    { label: 'judge', value: c.judgeModel ?? DEFAULT_JUDGE_MODEL },
    { label: 'swap bias', value: c.positionBias ? 'yes' : 'no' },
  ]} />
}
