import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function CritiqueNode(props: NodeProps<BaseNodeData>) {
  const c = props.data.config
  return <BaseNode {...props} preview={[
    { label: 'model', value: c.model ?? 'gpt-4o' },
    { label: 'auto-revise', value: c.autoRevise ? 'yes' : 'no' },
    { label: 'iterations', value: c.maxIterations ?? 1 },
  ]} />
}
