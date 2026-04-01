import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function RubricNode(props: NodeProps<BaseNodeData>) {
  const c = props.data.config
  const lines = String(c.criteria ?? '').split('\n').filter(Boolean)
  return <BaseNode {...props} preview={[
    { label: 'criteria', value: `${lines.length} dimensions` },
    { label: 'scale', value: c.scale ?? '1-5' },
    { label: 'weighted', value: c.weighted ? 'yes' : 'no' },
  ]} />
}
