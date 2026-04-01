import dagre from 'dagre'
import type { Node, Edge } from 'reactflow'

const NODE_WIDTH = 220
const NODE_HEIGHT = 110  // approximate — includes header + 3 preview rows

export type LayoutDirection = 'LR' | 'TB'

/**
 * Re-positions nodes using a dagre DAG layout.
 * Returns a new nodes array with updated positions; does not mutate input.
 */
export function applyAutoLayout(nodes: Node[], edges: Edge[], direction: LayoutDirection = 'TB'): Node[] {
  if (nodes.length === 0) return nodes

  const layoutNodes = nodes.filter((node) => node.type !== 'frame' && node.type !== 'text')
  const layoutNodeIds = new Set(layoutNodes.map((node) => node.id))
  if (layoutNodes.length === 0) return nodes

  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: direction, nodesep: 60, ranksep: 80, marginx: 40, marginy: 40 })

  layoutNodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  })

  edges.forEach((edge) => {
    if (!layoutNodeIds.has(edge.source) || !layoutNodeIds.has(edge.target)) return
    g.setEdge(edge.source, edge.target)
  })

  dagre.layout(g)

  return nodes.map((node) => {
    if (!layoutNodeIds.has(node.id)) return node
    const { x, y } = g.node(node.id)
    // dagre returns center x/y — React Flow uses top-left corner
    return {
      ...node,
      position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 },
    }
  })
}
