import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function StateNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config
  const preview = [
    { label: 'scope', value: config.scope ?? 'run' },
    { label: 'backend', value: config.backend ?? 'memory' },
    { label: 'checkpoint', value: config.backend === 'redis' || config.backend === 'postgres' ? config.checkpointing ?? 'pause' : 'off' },
  ]
  return <BaseNode {...props} preview={preview} />
}
