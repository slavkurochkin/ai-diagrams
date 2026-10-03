import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function LoopNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config
  const preview = [
    { label: 'mode', value: config.mode ?? 'parallel' },
    { label: 'max', value: config.mode === 'parallel' ? `${config.maxConcurrency ?? 5} at once` : config.maxIterations ?? 100 },
  ]
  return <BaseNode {...props} preview={preview} />
}
