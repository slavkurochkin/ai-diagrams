import type { Node, Edge } from 'reactflow'
import type { AnimationStep } from '../types/animation'
import type { BaseNodeData } from '../types/nodes'
import { getNodeDefinition } from './nodeDefinitions'

const ACTIVATE_DURATION = 900   // ms a node shows 'processing'
const TRAVERSE_DURATION = 750   // ms a data token travels an edge
const INTER_NODE_PAUSE  = 150   // ms gap between waves
const LOOP_RETURN_DURATION = 500 // ms pulse when a loop returns to a node

function isLoopbackEdge(edge: Edge): boolean {
  return edge.data?.kind === 'loopback'
}

/**
 * Topological sort using Kahn's algorithm.
 * Returns node IDs in processing order (leaves first).
 * Gracefully handles disconnected subgraphs and ignores cycles.
 */
function topoSort(nodes: Node[], edges: Edge[]): string[] {
  const inDegree = new Map<string, number>()
  const adj      = new Map<string, string[]>()

  for (const n of nodes) {
    inDegree.set(n.id, 0)
    adj.set(n.id, [])
  }

  for (const e of edges) {
    if (isLoopbackEdge(e)) continue
    if (!inDegree.has(e.source) || !inDegree.has(e.target)) continue
    adj.get(e.source)!.push(e.target)
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1)
  }

  const queue = [...nodes.map((n) => n.id).filter((id) => inDegree.get(id) === 0)]
  const sorted: string[] = []

  while (queue.length > 0) {
    const nodeId = queue.shift()!
    sorted.push(nodeId)
    for (const neighbor of adj.get(nodeId) ?? []) {
      const deg = (inDegree.get(neighbor) ?? 1) - 1
      inDegree.set(neighbor, deg)
      if (deg === 0) queue.push(neighbor)
    }
  }

  // Append any still-unvisited nodes so cyclic / unusual graphs still animate.
  for (const node of nodes) {
    if (!sorted.includes(node.id)) sorted.push(node.id)
  }

  return sorted
}

/**
 * Builds an AnimationStep[] from the current graph.
 * Sequence: activate node → traverse all its output edges → mark done → next node.
 */
export function sequenceFlow(
  nodes: Node<BaseNodeData>[],
  edges: Edge[],
): AnimationStep[] {
  if (nodes.length === 0) return []

  const sorted = topoSort(nodes, edges)
  const steps: AnimationStep[] = []

  // Build a lookup: nodeId → its outgoing edges
  const outEdges = new Map<string, Edge[]>()
  for (const n of nodes) outEdges.set(n.id, [])
  for (const e of edges) {
    if (outEdges.has(e.source)) outEdges.get(e.source)!.push(e)
  }

  // Build nodeId → accent color lookup
  const accentColor = new Map<string, string>()
  for (const n of nodes) {
    const def = getNodeDefinition(n.data.nodeType)
    accentColor.set(n.id, n.data.accentColor ?? def?.accentColor ?? '#14B8A6')
  }

  for (const nodeId of sorted) {
    // 1. Activate / process
    steps.push({ type: 'activate-node', nodeId, duration: ACTIVATE_DURATION })

    // 2. Traverse each outgoing edge (sequentially)
    for (const edge of outEdges.get(nodeId) ?? []) {
      steps.push({
        type: 'traverse-edge',
        edgeId: edge.id,
        duration: TRAVERSE_DURATION,
        color: accentColor.get(nodeId) ?? '#14B8A6',
      })

      // When a loopback returns to a node, briefly pulse that node so the
      // cycle is visible during playback.
      if (isLoopbackEdge(edge)) {
        steps.push({ type: 'activate-node', nodeId: edge.target, duration: LOOP_RETURN_DURATION })
        steps.push({ type: 'deactivate-node', nodeId: edge.target })
      }
    }

    // 3. Mark done
    steps.push({ type: 'deactivate-node', nodeId })

    // 4. Brief pause between nodes
    if (sorted.indexOf(nodeId) < sorted.length - 1) {
      steps.push({ type: 'pause', duration: INTER_NODE_PAUSE })
    }
  }

  return steps
}
