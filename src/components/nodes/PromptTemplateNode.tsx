import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData, PromptTemplateNodeConfig } from '../../types/nodes'

export default function PromptTemplateNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config as unknown as PromptTemplateNodeConfig

  // Show a truncated template preview + the variable names
  const rawTemplate = (config.template ?? '') as string
  const templatePreview =
    rawTemplate.length > 0
      ? rawTemplate.replace(/\s+/g, ' ').trim()
      : 'No template set'

  const preview = [
    { label: 'template', value: templatePreview },
    { label: 'vars', value: config.inputVariables ?? '' },
  ]

  return <BaseNode {...props} preview={preview} />
}
