import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function EvalMetricsNode(props: NodeProps<BaseNodeData>) {
  const c = props.data.config
  const active = ['bleu', 'rouge', 'bertScore', 'exactMatch', 'f1']
    .filter((k) => c[k])
    .join(', ') || 'none'
  return <BaseNode {...props} preview={[
    { label: 'metrics', value: active },
  ]} />
}
