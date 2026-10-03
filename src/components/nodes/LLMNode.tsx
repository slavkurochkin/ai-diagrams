import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import { DEFAULT_CHAT_MODEL, MODELS_WITH_TEMPERATURE } from '../../lib/modelCatalog'
import type { BaseNodeData, LLMNodeConfig } from '../../types/nodes'

export default function LLMNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config as unknown as LLMNodeConfig
  const model = config.model ?? DEFAULT_CHAT_MODEL

  // Show the knob that actually applies to this model: temperature or reasoning effort
  const preview = [
    { label: 'model', value: model },
    MODELS_WITH_TEMPERATURE.includes(model)
      ? { label: 'temp', value: config.temperature ?? 0.7 }
      : { label: 'effort', value: config.effort ?? 'default' },
    { label: 'output', value: config.responseFormat === 'json-schema' ? 'json schema' : 'text' },
  ]

  return <BaseNode {...props} preview={preview} />
}
