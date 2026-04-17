import type { Node, Edge } from 'reactflow'
import type { BaseNodeData } from '../../types/nodes'
import type { FlowContext } from '../../types/flow'
import { filterGraphForAI } from '../aiGraphFilter'

export interface SynthesizedFlowContext {
  description: string
  howItWorks: string
}

/**
 * Calls the server to draft Flow Context "What it does" + "How it works" from the current diagram
 * (node descriptions, labels, types, edges, configs). Optionally refines existing draft fields.
 */
export async function synthesizeFlowContextFromDiagram(
  nodes: Node<BaseNodeData>[],
  edges: Edge[],
  flowName: string,
  existing?: Pick<FlowContext, 'description' | 'howItWorks'> | null,
): Promise<SynthesizedFlowContext> {
  const { nodes: aiNodes, edges: aiEdges } = filterGraphForAI(nodes, edges)
  const payload = {
    flowName,
    nodes: aiNodes.map((n) => ({
      id: n.id,
      nodeType: n.data.nodeType,
      label: n.data.label,
      ...(typeof n.data.description === 'string' && n.data.description !== ''
        ? { description: n.data.description }
        : {}),
      config: (n.data.config ?? {}) as Record<string, unknown>,
    })),
    edges: aiEdges.map((e) => ({
      id: e.id,
      source: e.source,
      sourceHandle: e.sourceHandle ?? null,
      target: e.target,
      targetHandle: e.targetHandle ?? null,
    })),
    existingContext:
      existing &&
      (existing.description?.trim() || existing.howItWorks?.trim())
        ? {
            description: existing.description ?? '',
            howItWorks: existing.howItWorks ?? '',
          }
        : null,
  }

  const response = await fetch('/api/flow-context-synthesize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error ?? `flow-context-synthesize failed: ${response.status}`)
  }

  return response.json() as Promise<SynthesizedFlowContext>
}
