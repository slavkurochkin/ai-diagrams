import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function RedTeamNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config
  const categories = [
    config.jailbreaks && 'jailbreak',
    config.promptInjection && 'injection',
    config.piiExtraction && 'pii',
    config.harmfulRequests && 'harmful',
    config.overRefusalProbes && 'over-refusal',
  ].filter(Boolean)
  const preview = [
    { label: 'attacks', value: categories.join(', ') || '—' },
    { label: 'per type', value: config.casesPerCategory ?? 25 },
    { label: 'multi-turn', value: config.multiTurn ? 'yes' : 'no' },
  ]
  return <BaseNode {...props} preview={preview} />
}
