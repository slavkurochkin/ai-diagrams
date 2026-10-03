import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function CodeExecNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config
  const preview = [
    { label: 'lang', value: config.language ?? 'python' },
    { label: 'sandbox', value: config.sandbox ?? 'hosted' },
    { label: 'network', value: config.networkAccess ? 'on' : 'off' },
  ]
  return <BaseNode {...props} preview={preview} />
}
