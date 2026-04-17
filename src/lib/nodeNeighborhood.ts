import type { Node, Edge } from 'reactflow'
import type { BaseNodeData } from '../types/nodes'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SerializedNeighborNode {
  id: string
  nodeType: string
  label: string
  description?: string
  config: Record<string, string | number | boolean>
}

export interface NodeNeighborhood {
  target: SerializedNeighborNode
  upstream: SerializedNeighborNode[]   // nodes whose output feeds into target
  downstream: SerializedNeighborNode[] // nodes that target feeds into
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function serializeNode(n: Node<BaseNodeData>): SerializedNeighborNode {
  const desc = typeof n.data.description === 'string' ? n.data.description.trim() : ''
  return {
    id: n.id,
    nodeType: n.data.nodeType,
    label: n.data.label,
    ...(desc ? { description: desc } : {}),
    config: n.data.config ?? {},
  }
}

// ── Resolver ──────────────────────────────────────────────────────────────────

export function resolveNeighborhood(
  nodeId: string,
  nodes: Node<BaseNodeData>[],
  edges: Edge[],
): NodeNeighborhood | null {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const target = nodeMap.get(nodeId)
  if (!target) return null

  const upstreamIds = new Set(
    edges.filter((e) => e.target === nodeId).map((e) => e.source),
  )
  const downstreamIds = new Set(
    edges.filter((e) => e.source === nodeId).map((e) => e.target),
  )

  return {
    target: serializeNode(target),
    upstream: [...upstreamIds]
      .map((id) => nodeMap.get(id))
      .filter((n): n is Node<BaseNodeData> => !!n)
      .map(serializeNode),
    downstream: [...downstreamIds]
      .map((id) => nodeMap.get(id))
      .filter((n): n is Node<BaseNodeData> => !!n)
      .map(serializeNode),
  }
}
