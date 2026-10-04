import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function ExposedToolNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config
  const preview = [
    { label: 'tool', value: config.toolName || '—' },
    { label: 'scope', value: config.requiredScope || '—' },
    { label: 'hints', value: [config.readOnly ? 'read-only' : 'writes', config.destructive && 'destructive', config.deprecated && 'deprecated', `v${config.version ?? 1}`].filter(Boolean).join(', ') },
  ]
  return <BaseNode {...props} preview={preview} />
}
