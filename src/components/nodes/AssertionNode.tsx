import type { NodeProps } from 'reactflow'
import BaseNode from './base/BaseNode'
import type { BaseNodeData } from '../../types/nodes'

export default function AssertionNode(props: NodeProps<BaseNodeData>) {
  const config = props.data.config
  const preview = [
    { label: 'check', value: config.checkType ?? 'json-schema' },
    { label: 'spec', value: config.spec ?? '' },
  ]
  return <BaseNode {...props} preview={preview} />
}
