import type { WorkflowPatch } from './workflowPatch'
import { resolveNodeRef } from './workflowPatch'
import { useFlowStore } from '../hooks/useFlowStore'

/** Grid for AI-placed nodes (approx. card size + breathing room). */
const TILE_W = 320
const TILE_H = 185
const GRID_COLS = 3
const ORIGIN_X = 64
const ORIGIN_Y = 80

/** Rough footprint for overlap checks (top-left anchored like React Flow). */
const NODE_PLACEHOLDER_W = 260
const NODE_PLACEHOLDER_H = 130
const MIN_CLEARANCE = 48

function defaultGridPosition(slot: number): { x: number; y: number } {
  const col = slot % GRID_COLS
  const row = Math.floor(slot / GRID_COLS)
  return { x: ORIGIN_X + col * TILE_W, y: ORIGIN_Y + row * TILE_H }
}

function placementOverlapsExisting(
  pos: { x: number; y: number },
  existing: ReadonlyArray<{ position: { x: number; y: number } }>,
): boolean {
  for (const n of existing) {
    const dx = Math.abs(pos.x - n.position.x)
    const dy = Math.abs(pos.y - n.position.y)
    if (dx < NODE_PLACEHOLDER_W + MIN_CLEARANCE && dy < NODE_PLACEHOLDER_H + MIN_CLEARANCE) {
      return true
    }
  }
  return false
}

function resolveAddNodePosition(
  patchPosition: { x: number; y: number } | undefined,
  existingNodes: ReadonlyArray<{ position: { x: number; y: number } }>,
): { x: number; y: number } {
  const slot = existingNodes.length
  if (
    patchPosition &&
    !placementOverlapsExisting(patchPosition, existingNodes)
  ) {
    return patchPosition
  }
  return defaultGridPosition(slot)
}

/** Applies server-validated patches to the Zustand flow store. */
export function applyWorkflowPatchesToFlow(patches: WorkflowPatch[]): void {
  if (patches.length === 0) return
  useFlowStore.getState().pushWorkflowApplySnapshot()
  for (const p of patches) {
    const store = useFlowStore.getState()

    switch (p.op) {
      case 'addNode': {
        const pos = resolveAddNodePosition(p.position, store.nodes)
        const cfg = p.config as Record<string, string | number | boolean> | undefined
        store.addNode(p.nodeType, pos, cfg, { id: p.id, label: p.label, note: p.note })
        break
      }
      case 'removeNode':
        store.removeNode(p.id)
        break
      case 'addEdge': {
        const sim = new Map(
          store.nodes.map((n) => [
            n.id,
            {
              id: n.id,
              nodeType: n.data.nodeType,
              label: n.data.label,
              config: { ...n.data.config } as Record<string, unknown>,
            },
          ]),
        )
        const src = resolveNodeRef(p.source, sim) ?? p.source
        const tgt = resolveNodeRef(p.target, sim) ?? p.target
        store.addEdge(
          {
            source: src,
            target: tgt,
            sourceHandle: p.sourceHandle,
            targetHandle: p.targetHandle,
          },
          { id: p.id },
        )
        break
      }
      case 'removeEdge':
        store.removeEdge(p.id)
        break
      case 'setNodeConfig': {
        const cfg = p.config as Partial<Record<string, string | number | boolean>>
        store.updateNodeConfig(p.nodeId, cfg, p.merge !== false)
        break
      }
      case 'setNodeLabel':
        store.updateNodeLabel(p.nodeId, p.label)
        break
      default:
        break
    }
  }
}
