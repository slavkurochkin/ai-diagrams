import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function MCPEndpointNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config
  const exposes = [
    config.exposeTools && 'tools',
    config.exposeResources && 'resources',
    config.exposePrompts && 'prompts',
  ].filter(Boolean)
  const preview = [
    { label: 'server', value: config.serverName || '—' },
    { label: 'transport', value: config.transport === 'stdio' ? 'stdio' : `http, ${config.sessions ?? 'stateless'}` },
    { label: 'exposes', value: exposes.join(', ') || '—' },
  ]
  return <BaseNode {...props} preview={preview} />
}
