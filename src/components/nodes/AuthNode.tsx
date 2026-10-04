import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function AuthNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config
  const preview = [
    { label: 'method', value: config.method ?? 'oauth' },
    { label: 'tenant', value: config.tenantFrom || '—' },
  ]
  return <BaseNode {...props} preview={preview} />
}
