import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function EvalDatasetNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config
  const preview = [
    { label: 'source', value: config.source ?? 'file' },
    { label: 'split', value: config.split ?? 'test' },
    { label: 'version', value: config.version || 'unpinned' },
  ]
  return <BaseNode {...props} preview={preview} />
}
