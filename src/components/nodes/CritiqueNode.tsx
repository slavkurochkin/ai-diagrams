import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import { DEFAULT_CHAT_MODEL } from '../../lib/modelCatalog'
import type { BaseNodeData } from '../../types/nodes'

export default function CritiqueNode(props: NodeProps<BaseNodeData>) {
  const c = props.data.config
  return <BaseNode {...props} preview={[
    { label: 'model', value: c.model ?? DEFAULT_CHAT_MODEL },
    { label: 'auto-revise', value: c.autoRevise ? 'yes' : 'no' },
    { label: 'iterations', value: c.maxIterations ?? 1 },
  ]} />
}
