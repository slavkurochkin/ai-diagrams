import type { Edge, Node } from 'reactflow'
import type { BaseNodeData } from '../../types/nodes'
import type { FlowContext } from '../../types/flow'
import type { SerializedEdge, SerializedNode, WorkflowPatch } from '../workflowPatch'

export function serializeFlowForWorkflowApi(
  nodes: Node<BaseNodeData>[],
  edges: Edge[],
): { nodes: SerializedNode[]; edges: SerializedEdge[] } {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      nodeType: n.data.nodeType,
      label: n.data.label,
      config: { ...n.data.config },
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      sourceHandle: e.sourceHandle ?? null,
      target: e.target,
      targetHandle: e.targetHandle ?? null,
    })),
  }
}

export interface WorkflowBuildMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface WorkflowBuildResponse {
  role: 'assistant'
  content: string | null
  finish_reason: string | null
  validatedPatches: WorkflowPatch[]
  validationErrors: string[]
}

export async function fetchNodeCatalog(): Promise<unknown> {
  const response = await fetch('/api/node-catalog')
  if (!response.ok) throw new Error(`node-catalog failed: ${response.status}`)
  return response.json()
}

export async function workflowBuildChat(
  messages: WorkflowBuildMessage[],
  graph?: {
    nodes: SerializedNode[]
    edges: SerializedEdge[]
    flowName?: string
    flowContext?: FlowContext | null
  },
): Promise<WorkflowBuildResponse> {
  const response = await fetch('/api/workflow-build', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      nodes: graph?.nodes ?? [],
      edges: graph?.edges ?? [],
      flowName: graph?.flowName,
      flowContext: graph?.flowContext ?? null,
    }),
  })
  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error ?? `workflow-build failed: ${response.status}`)
  }
  return response.json() as Promise<WorkflowBuildResponse>
}
