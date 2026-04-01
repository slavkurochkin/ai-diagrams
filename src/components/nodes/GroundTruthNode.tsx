import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function GroundTruthNode(props: NodeProps<BaseNodeData>) {
  const c = props.data.config
  return <BaseNode {...props} preview={[
    { label: 'source', value: c.source ?? 'manual' },
    { label: 'dataset', value: c.datasetPath || '—' },
  ]} />
}
