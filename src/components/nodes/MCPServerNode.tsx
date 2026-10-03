import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function MCPServerNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config
  const preview = [
    { label: 'server', value: config.serverName ?? '' },
    { label: 'transport', value: config.transport ?? 'http' },
    { label: 'tools', value: config.allowedTools || 'all' },
  ]
  return <BaseNode {...props} preview={preview} />
}
