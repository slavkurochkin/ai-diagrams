import type { Edge, Node } from 'reactflow'
import type { BaseNodeData } from '../types/nodes'

const NON_AI_NODE_TYPES = new Set(['frame', 'text', 'character'])

export function isAINodeType(nodeType: string): boolean {
  return !NON_AI_NODE_TYPES.has(nodeType)
}

export function filterGraphForAI(
  nodes: Node<BaseNodeData>[],
  edges: Edge[],
): { nodes: Node<BaseNodeData>[]; edges: Edge[] } {
  const filteredNodes = nodes.filter((n) => isAINodeType(n.data.nodeType))
  const keepIds = new Set(filteredNodes.map((n) => n.id))
  const filteredEdges = edges.filter((e) => keepIds.has(e.source) && keepIds.has(e.target))
  return { nodes: filteredNodes, edges: filteredEdges }
}

