import * as yaml from 'js-yaml'
import type { Node, Edge } from 'reactflow'
import type { BaseNodeData } from '../types/nodes'
import type { NotePlacement } from '../types/nodes'
import { buildDefaultConfig, getNodeDefinition } from './nodeDefinitions'

// ── YAML schema types ─────────────────────────────────────────────────────────

interface YAMLNodeSpec {
  id: string
  type: string
  label?: string
  /** Instance intent in this diagram (plain text). */
  description?: string
  accentColor?: string
  headerTextColor?: string
  config?: Record<string, string | number | boolean>
  note?: string
  noteAlwaysVisible?: boolean
  notePlacement?: NotePlacement
  portOrder?: { inputs?: string[]; outputs?: string[] }
  portOffsets?: Record<string, number>
  position?: {
    x: number
    y: number
  }
}

function getSizedNodeStyle(
  type: string,
  config?: Record<string, string | number | boolean>,
): { width: number; height: number } | undefined {
  if (type === 'frame') {
    return {
      width: typeof config?.width === 'number' ? config.width : 420,
      height: typeof config?.height === 'number' ? config.height : 260,
    }
  }
  if (type === 'text') {
    return {
      width: typeof config?.width === 'number' ? config.width : 320,
      height: typeof config?.height === 'number' ? config.height : 160,
    }
  }
  return undefined
}

interface YAMLEdgeSpec {
  from: string
  to: string
  fromHandle?: string
  toHandle?: string
  kind?: 'default' | 'loopback' | 'eval'
  lane?: 'top' | 'bottom' | 'left' | 'right'
  executionPriority?: number
}

interface FlowYAMLDoc {
  name?: string
  description?: string
  layoutDirection?: 'TB' | 'LR'
  nodes: YAMLNodeSpec[]
  edges?: YAMLEdgeSpec[]
}

/** Matches BaseNode: auto/undefined → bottom for LR, right for TB. */
function effectiveNotePlacementForExport(
  notePlacement: NotePlacement | undefined,
  layoutDirection: 'TB' | 'LR',
): 'right' | 'bottom' {
  if (notePlacement === 'right' || notePlacement === 'bottom') return notePlacement
  return layoutDirection === 'LR' ? 'bottom' : 'right'
}

// ── Parse ─────────────────────────────────────────────────────────────────────

export interface ParsedFlow {
  name: string
  nodes: Node<BaseNodeData>[]
  edges: Edge[]
  hasExplicitPositions: boolean
  layoutDirection?: 'TB' | 'LR'
}

let _counter = 2000

/**
 * Parses a YAML string into React Flow nodes and edges.
 * Returns `{ error }` on failure.
 *
 * Schema:
 * ```yaml
 * name: My Flow
 * nodes:
 *   - id: loader          # short id used in edge references
 *     type: dataLoader    # must match a registered NodeDefinition type
 *     label: Doc Loader   # optional label override
 *     config:             # optional config overrides
 *       source: local
 *     note: "Markdown note"
 * edges:
 *   - from: loader
 *     to: chunker
 *     fromHandle: documents   # optional handle id
 *     toHandle: text          # optional handle id
 *     portOrder:              # optional — custom port order on the node edge
 *       inputs: [prompt, memory, tools]
 *     portOffsets:            # optional — slide ports along the edge (0–100)
 *       prompt: 35
 * ```
 */
export function parseFlowYAML(yamlStr: string): ParsedFlow | { error: string } {
  let doc: FlowYAMLDoc
  try {
    doc = yaml.load(yamlStr) as FlowYAMLDoc
  } catch (e) {
    return { error: `YAML parse error: ${e instanceof Error ? e.message : String(e)}` }
  }

  if (!doc || typeof doc !== 'object') {
    return { error: 'Invalid YAML: expected a mapping at the top level' }
  }
  if (!Array.isArray(doc.nodes) || doc.nodes.length === 0) {
    return { error: '"nodes" must be a non-empty array' }
  }

  const idMap = new Map<string, string>() // yaml id → react flow id

  const nodes: Node<BaseNodeData>[] = []
  for (const n of doc.nodes) {
    if (!n.id || !n.type) {
      return { error: `Every node must have both "id" and "type" fields` }
    }
    if (!getNodeDefinition(n.type)) {
      return { error: `Unknown node type: "${n.type}"` }
    }
    const rfId = `${n.type}-${_counter++}`
    idMap.set(n.id, rfId)
    const sizedStyle = getSizedNodeStyle(n.type, n.config)
    const baseConfig = { ...buildDefaultConfig(n.type), ...(n.config ?? {}) }
    const fromYaml = typeof n.description === 'string' ? n.description.trim() : ''
    const cfgDesc =
      typeof baseConfig.description === 'string' ? String(baseConfig.description).trim() : ''
    let config = { ...baseConfig }
    let nodeDescription: string | undefined
    if (fromYaml) {
      nodeDescription = fromYaml
      if ('description' in config) delete config.description
    } else if (cfgDesc) {
      nodeDescription = cfgDesc
      delete config.description
    }
    nodes.push({
      id: rfId,
      type: n.type,
      position: n.position ?? { x: 0, y: 0 }, // auto-layout will position nodes without explicit coords
      ...(n.type === 'frame' ? { zIndex: -1 } : {}),
      ...(sizedStyle ? { style: sizedStyle } : {}),
      data: {
        nodeType: n.type,
        label: n.label ?? getNodeDefinition(n.type)!.label,
        ...(nodeDescription ? { description: nodeDescription } : {}),
        ...(n.accentColor !== undefined && { accentColor: n.accentColor }),
        ...(n.headerTextColor !== undefined &&
          typeof n.headerTextColor === 'string' &&
          n.headerTextColor.trim() && { headerTextColor: n.headerTextColor.trim() }),
        config,
        animationState: 'idle',
        ...(n.note !== undefined && { note: n.note }),
        ...(n.noteAlwaysVisible !== undefined && { noteAlwaysVisible: n.noteAlwaysVisible }),
        ...(n.notePlacement !== undefined && { notePlacement: n.notePlacement }),
        ...(n.portOrder !== undefined &&
          typeof n.portOrder === 'object' &&
          n.portOrder !== null && { portOrder: { ...n.portOrder } }),
        ...(n.portOffsets !== undefined &&
          typeof n.portOffsets === 'object' &&
          n.portOffsets !== null && { portOffsets: { ...n.portOffsets } }),
      },
    })
  }

  // Remap character dependency IDs after import IDs are generated.
  // YAML stores original node ids, but imported React Flow ids are regenerated.
  for (const node of nodes) {
    if (node.data.nodeType !== 'character') continue
    const rawDependsOn = node.data.config?.dependsOnCharacterId
    if (typeof rawDependsOn !== 'string' || rawDependsOn.trim() === '') continue
    const mappedId = idMap.get(rawDependsOn.trim())
    if (mappedId) {
      node.data.config.dependsOnCharacterId = mappedId
    } else {
      node.data.config.dependsOnCharacterId = ''
    }
  }

  const edges: Edge[] = []
  for (let i = 0; i < (doc.edges ?? []).length; i++) {
    const e = doc.edges![i]
    const source = idMap.get(e.from)
    const target = idMap.get(e.to)
    if (!source) return { error: `Edge references unknown source node: "${e.from}"` }
    if (!target) return { error: `Edge references unknown target node: "${e.to}"` }
    edges.push({
      id: `yaml-edge-${i}-${_counter++}`,
      source,
      target,
      sourceHandle: e.fromHandle ?? null,
      targetHandle: e.toHandle ?? null,
      type: 'smoothstep',
      ...((e.kind || e.lane || e.executionPriority !== undefined)
        ? {
            data: {
              ...(e.kind !== undefined ? { kind: e.kind } : {}),
              ...(e.lane !== undefined ? { lane: e.lane } : {}),
              ...(e.executionPriority !== undefined ? { executionPriority: e.executionPriority } : {}),
            },
          }
        : {}),
    })
  }

  // Only skip auto-layout when every node has explicit x/y (avoids mixed 0,0 + real coords).
  const hasExplicitPositions = doc.nodes.every(
    (n) =>
      n.position != null &&
      typeof n.position.x === 'number' &&
      Number.isFinite(n.position.x) &&
      typeof n.position.y === 'number' &&
      Number.isFinite(n.position.y),
  )

  return { name: doc.name ?? 'Imported Flow', nodes, edges, hasExplicitPositions, layoutDirection: doc.layoutDirection }
}

// ── Serialize ─────────────────────────────────────────────────────────────────

/**
 * Serializes current flow nodes + edges back to a YAML string.
 * Uses node IDs directly as the short ids.
 */
export function serializeFlowToYAML(
  name: string,
  nodes: Node<BaseNodeData>[],
  edges: Edge[],
  layoutDirection: 'TB' | 'LR',
): string {
  const doc = {
    name,
    layoutDirection,
    nodes: nodes.map((n) => {
      const defLabel = getNodeDefinition(n.data.nodeType)?.label
      const defAccent = getNodeDefinition(n.data.nodeType)?.accentColor
      const entry: Record<string, unknown> = { id: n.id, type: n.data.nodeType }
      if (n.data.label !== defLabel) entry.label = n.data.label
      if (n.data.accentColor && n.data.accentColor !== defAccent) entry.accentColor = n.data.accentColor
      if (typeof n.data.headerTextColor === 'string' && n.data.headerTextColor.trim()) {
        entry.headerTextColor = n.data.headerTextColor.trim()
      }
      if (typeof n.data.description === 'string' && n.data.description.trim()) {
        entry.description = n.data.description.trim()
      }
      const cfg = n.data.config
      if (cfg && Object.keys(cfg).length > 0) entry.config = cfg
      if (n.data.note) entry.note = n.data.note
      if (n.data.noteAlwaysVisible) entry.noteAlwaysVisible = true
      // Always persist effective placement for nodes with notes so YAML round-trip matches the canvas
      // (auto/undefined is layout-dependent in the UI but was previously omitted from YAML).
      if (n.data.note) {
        entry.notePlacement = effectiveNotePlacementForExport(n.data.notePlacement, layoutDirection)
      }
      if (n.data.portOrder && (n.data.portOrder.inputs?.length || n.data.portOrder.outputs?.length)) {
        entry.portOrder = { ...n.data.portOrder }
      }
      if (n.data.portOffsets && Object.keys(n.data.portOffsets).length > 0) {
        entry.portOffsets = { ...n.data.portOffsets }
      }
      // Always persist position (including 0,0) so reimport matches the canvas.
      // Round to integers — sub-pixel precision is invisible but causes float drift on round-trip.
      entry.position = { x: Math.round(n.position.x), y: Math.round(n.position.y) }
      return entry
    }),
    edges: edges.map((e) => {
      const entry: Record<string, unknown> = { from: e.source, to: e.target }
      if (e.sourceHandle) entry.fromHandle = e.sourceHandle
      if (e.targetHandle) entry.toHandle = e.targetHandle
      if (typeof e.data === 'object' && e.data && 'kind' in e.data) entry.kind = e.data.kind
      if (typeof e.data === 'object' && e.data && 'lane' in e.data) entry.lane = e.data.lane
      if (typeof e.data === 'object' && e.data && 'executionPriority' in e.data) {
        const raw = e.data.executionPriority
        if (typeof raw === 'number' && Number.isFinite(raw)) {
          entry.executionPriority = Math.max(1, Math.floor(raw))
        }
      }
      return entry
    }),
  }
  return yaml.dump(doc, { lineWidth: 100, noRefs: true })
}
