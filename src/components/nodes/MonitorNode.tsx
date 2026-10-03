import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function MonitorNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config
  const preview = [
    { label: 'metric', value: config.metric === 'custom' ? config.customMetric || 'custom' : config.metric ?? 'latencyP95' },
    { label: 'alert if', value: `${config.operator ?? '>'} ${config.threshold ?? 10}` },
    { label: 'window', value: config.window ?? '1h' },
  ]
  return <BaseNode {...props} preview={preview} />
}
