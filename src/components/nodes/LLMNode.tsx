import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import {
  CLAUDE_EFFORT_MODELS,
  DEFAULT_CHAT_MODEL,
  GEMINI_THINKING_LEVEL_MODELS,
  OPENAI_REASONING_MODELS,
  THINKING_BUDGET_MODELS,
} from '../../lib/modelCatalog'
import type { BaseNodeData, LLMNodeConfig } from '../../types/nodes'

/** The one knob that controls this model's reasoning (or randomness), as shown on the card. */
function reasoningPreview(model: string, config: LLMNodeConfig) {
  if (CLAUDE_EFFORT_MODELS.includes(model)) return { label: 'effort', value: config.effort ?? 'default' }
  if (OPENAI_REASONING_MODELS.includes(model)) return { label: 'reasoning', value: config.reasoningEffort ?? 'default' }
  if (GEMINI_THINKING_LEVEL_MODELS.includes(model)) return { label: 'thinking', value: config.thinkingLevel ?? 'default' }
  if (THINKING_BUDGET_MODELS.includes(model) && Number(config.thinkingBudget) > 0) {
    return { label: 'thinking', value: `${config.thinkingBudget} tok` }
  }
  return { label: 'temp', value: config.temperature ?? 0.7 }
}

export default function LLMNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config as unknown as LLMNodeConfig
  const model = config.model ?? DEFAULT_CHAT_MODEL

  const preview = [
    { label: 'model', value: model },
    reasoningPreview(model, config),
    { label: 'output', value: config.responseFormat === 'json-schema' ? 'json schema' : 'text' },
  ]

  return <BaseNode {...props} preview={preview} />
}
