import type { Node, Edge } from 'reactflow'
import type { AnimationStep } from '../types/animation'
import type { BaseNodeData } from '../types/nodes'
import { getNodeDefinition } from './nodeDefinitions'

const ACTIVATE_DURATION = 900   // ms a node shows 'processing'
const TRAVERSE_DURATION = 750   // ms a data token travels an edge
const INTER_NODE_PAUSE  = 150   // ms gap between waves
const LOOP_RETURN_DURATION = 1000 // ms pulse when a loop returns to a node

function isLoopbackEdge(edge: Edge): boolean {
  return edge.data?.kind === 'loopback'
}

function getEdgePriority(edge: Edge): number {
  const raw = edge.data?.executionPriority
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.max(1, Math.floor(raw))
  if (typeof raw === 'string') {
    const parsed = Number(raw)
    if (Number.isFinite(parsed)) return Math.max(1, Math.floor(parsed))
  }
  return 1
}

/**
 * Builds an AnimationStep[] from the current graph.
 * Sequence is graph-driven:
 * - A node runs when all of its non-loopback inputs are satisfied.
 * - Outgoing branches from a node traverse in parallel.
 * - Disconnected / cyclic leftovers still animate in canvas order.
 */
/**
 * Builds steps starting from a specific node, animating only the subgraph
 * reachable from it (downstream nodes only).
 */
export function sequenceFlowFrom(
  nodes: Node<BaseNodeData>[],
  edges: Edge[],
  startNodeId: string,
): AnimationStep[] {
  if (!nodes.some((n) => n.id === startNodeId)) return sequenceFlow(nodes, edges)

  // BFS forward (all edges, including loopbacks) to find reachable nodes
  const forward = new Map<string, string[]>()
  for (const n of nodes) forward.set(n.id, [])
  for (const e of edges) {
    if (forward.has(e.source)) forward.get(e.source)!.push(e.target)
  }

  const reachable = new Set<string>([startNodeId])
  const queue = [startNodeId]
  while (queue.length > 0) {
    const curr = queue.shift()!
    for (const next of forward.get(curr) ?? []) {
      if (!reachable.has(next)) {
        reachable.add(next)
        queue.push(next)
      }
    }
  }

  const filteredNodes = nodes.filter((n) => reachable.has(n.id))
  // Exclude non-loopback edges *targeting* startNodeId so its inDegree stays 0
  const filteredEdges = edges.filter(
    (e) =>
      reachable.has(e.source) &&
      reachable.has(e.target) &&
      (e.target !== startNodeId || isLoopbackEdge(e)),
  )

  return sequenceFlow(filteredNodes, filteredEdges)
}

export function sequenceFlow(
  nodes: Node<BaseNodeData>[],
  edges: Edge[],
): AnimationStep[] {
  if (nodes.length === 0) return []

  const steps: AnimationStep[] = []
  const nodeIndex = new Map<string, number>(nodes.map((n, idx) => [n.id, idx]))

  // Build lookups for graph traversal
  const outEdges = new Map<string, Edge[]>()
  const inDegree = new Map<string, number>()
  for (const n of nodes) outEdges.set(n.id, [])
  for (const n of nodes) inDegree.set(n.id, 0)
  for (const e of edges) {
    if (outEdges.has(e.source)) {
      outEdges.get(e.source)!.push(e)
    }
    if (!isLoopbackEdge(e) && inDegree.has(e.target)) {
      inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1)
    }
  }

  // Build nodeId → accent color lookup
  const accentColor = new Map<string, string>()
  for (const n of nodes) {
    const def = getNodeDefinition(n.data.nodeType)
    accentColor.set(n.id, n.data.accentColor ?? def?.accentColor ?? '#14B8A6')
  }

  // Per-node outgoing edges grouped by priority.
  const nodePriorityGroups = new Map<string, { priorities: number[]; groups: Map<number, Edge[]> }>()
  for (const node of nodes) {
    const grouped = new Map<number, Edge[]>()
    for (const edge of outEdges.get(node.id) ?? []) {
      const priority = getEdgePriority(edge)
      const bucket = grouped.get(priority) ?? []
      bucket.push(edge)
      grouped.set(priority, bucket)
    }
    const priorities = [...grouped.keys()].sort((a, b) => a - b)
    nodePriorityGroups.set(node.id, { priorities, groups: grouped })
  }

  const hasIncomingLoopback = new Map<string, boolean>()
  for (const n of nodes) hasIncomingLoopback.set(n.id, false)
  for (const e of edges) {
    if (isLoopbackEdge(e) && hasIncomingLoopback.has(e.target)) {
      hasIncomingLoopback.set(e.target, true)
    }
  }

  type ActiveNodeState = { priorityIdx: number; waitingForLoopback: boolean }
  const activeNodes = new Map<string, ActiveNodeState>()
  const doneNodes = new Set<string>()
  const shownNodes = new Set<string>()

  const enqueueReadyNodes = (candidateIds: string[]) => {
    const ready = candidateIds
      .filter((id) => !doneNodes.has(id) && !activeNodes.has(id) && (inDegree.get(id) ?? 0) <= 0)
      .sort((a, b) => (nodeIndex.get(a) ?? 0) - (nodeIndex.get(b) ?? 0))
    if (ready.length === 0) return

    for (const nodeId of ready) {
      activeNodes.set(nodeId, { priorityIdx: 0, waitingForLoopback: false })
      shownNodes.add(nodeId)
    }

    if (ready.length === 1) {
      steps.push({ type: 'activate-node', nodeId: ready[0], duration: ACTIVATE_DURATION })
    } else {
      steps.push({ type: 'activate-nodes', nodeIds: ready, duration: ACTIVATE_DURATION })
    }
  }

  enqueueReadyNodes(nodes.map((n) => n.id))

  while (doneNodes.size < nodes.length) {
    // In fully-cyclic islands no node reaches inDegree 0; pick next by canvas order.
    if (activeNodes.size === 0) {
      const forced = nodes.find((n) => !doneNodes.has(n.id))
      if (!forced) break
      enqueueReadyNodes([forced.id])
      if (activeNodes.size === 0) {
        activeNodes.set(forced.id, { priorityIdx: 0, waitingForLoopback: false })
        shownNodes.add(forced.id)
        steps.push({ type: 'activate-node', nodeId: forced.id, duration: ACTIVATE_DURATION })
      }
    }

    const waveEdges: { edgeId: string; targetNodeId: string; color: string }[] = []
    const loopbackTargets: string[] = []
    const decrementedTargets: string[] = []
    const processedThisWave: string[] = []

    for (const [nodeId, state] of activeNodes) {
      if (state.waitingForLoopback) continue

      const meta = nodePriorityGroups.get(nodeId)
      if (!meta) continue

      const priority = meta.priorities[state.priorityIdx]
      const group = priority !== undefined ? meta.groups.get(priority) ?? [] : []
      processedThisWave.push(nodeId)

      for (const edge of group) {
        waveEdges.push({
          edgeId: edge.id,
          targetNodeId: edge.target,
          color: accentColor.get(nodeId) ?? '#14B8A6',
        })

        if (isLoopbackEdge(edge)) {
          loopbackTargets.push(edge.target)
          continue
        }

        if (inDegree.has(edge.target)) {
          const nextDeg = (inDegree.get(edge.target) ?? 1) - 1
          inDegree.set(edge.target, nextDeg)
          if (nextDeg <= 0) decrementedTargets.push(edge.target)
        }
      }
    }

    if (waveEdges.length === 1) {
      const [edge] = waveEdges
      steps.push({
        type: 'traverse-edge',
        edgeId: edge.edgeId,
        targetNodeId: edge.targetNodeId,
        duration: TRAVERSE_DURATION,
        color: edge.color,
      })
    } else if (waveEdges.length > 1) {
      steps.push({
        type: 'traverse-edges',
        duration: TRAVERSE_DURATION,
        edges: waveEdges,
      })
    }

    for (const targetId of loopbackTargets) {
      const targetState = activeNodes.get(targetId)
      if (targetState && targetState.waitingForLoopback) {
        targetState.waitingForLoopback = false
        activeNodes.set(targetId, targetState)
      }
      if (!shownNodes.has(targetId)) {
        shownNodes.add(targetId)
        steps.push({ type: 'activate-node', nodeId: targetId, duration: LOOP_RETURN_DURATION })
        steps.push({ type: 'deactivate-node', nodeId: targetId })
      }
    }

    for (const nodeId of processedThisWave) {
      const meta = nodePriorityGroups.get(nodeId)
      const state = activeNodes.get(nodeId)
      if (!meta || !state) continue
      state.priorityIdx += 1
      if (state.priorityIdx >= meta.priorities.length) {
        steps.push({ type: 'deactivate-node', nodeId })
        doneNodes.add(nodeId)
        activeNodes.delete(nodeId)
      } else {
        if (hasIncomingLoopback.get(nodeId)) {
          // Nodes in a feedback loop (e.g. agent) wait for returned signal
          // before emitting the next priority wave.
          state.waitingForLoopback = true
        }
        activeNodes.set(nodeId, state)
      }
    }

    // Safety valve: if everything is waiting and no loopback arrives, advance.
    if (processedThisWave.length === 0 && waveEdges.length === 0 && activeNodes.size > 0) {
      for (const [nodeId, state] of activeNodes) {
        if (state.waitingForLoopback) {
          state.waitingForLoopback = false
          activeNodes.set(nodeId, state)
        }
      }
    }

    enqueueReadyNodes(decrementedTargets)

    if (doneNodes.size < nodes.length && (activeNodes.size > 0 || decrementedTargets.length > 0)) {
      steps.push({ type: 'pause', duration: INTER_NODE_PAUSE })
    }
  }

  return steps
}
