import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData, LLMNodeConfig } from '../../types/nodes'

export default function LLMNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config as unknown as LLMNodeConfig

  // Show model name + temperature in the body preview
  const preview = [
    { label: 'model', value: config.model ?? 'gpt-4o' },
    { label: 'temp', value: config.temperature ?? 0.7 },
    { label: 'tokens', value: config.maxTokens ?? 1024 },
  ]

  return <BaseNode {...props} preview={preview} />
}
