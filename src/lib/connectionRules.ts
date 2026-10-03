import type { PortDefinition, PortType } from '../types/nodes'
import { getNodeDefinition, resolveNodePorts } from './nodeDefinitions'

// ── Connection rules ─────────────────────────────────────────────────────────
// Single source of truth for "may this output connect to that input?".
// Used by the canvas (drag-to-connect), AI workflow patches, and YAML import,
// so every path into a diagram enforces the same rules.

/** `any` connects to everything; otherwise port types must match exactly. */
export function portsCompatible(src: PortType, tgt: PortType): boolean {
  if (src === 'any' || tgt === 'any') return true
  return src === tgt
}

export interface ConnectionEnd {
  nodeType: string
  config?: Record<string, unknown>
}

export type ConnectionCheck =
  | { ok: true; sourcePort: PortDefinition; targetPort: PortDefinition }
  | { ok: false; error: string }

/** Validates a concrete edge: both handles must exist on their (config-resolved) nodes and be type-compatible. */
export function checkConnection(
  source: ConnectionEnd,
  sourceHandle: string | null | undefined,
  target: ConnectionEnd,
  targetHandle: string | null | undefined,
): ConnectionCheck {
  const srcDef = getNodeDefinition(source.nodeType)
  const tgtDef = getNodeDefinition(target.nodeType)
  if (!srcDef) return { ok: false, error: `unknown node type "${source.nodeType}"` }
  if (!tgtDef) return { ok: false, error: `unknown node type "${target.nodeType}"` }

  const sourcePort = resolveNodePorts(srcDef, source.config).outputs.find((p) => p.id === sourceHandle)
  const targetPort = resolveNodePorts(tgtDef, target.config).inputs.find((p) => p.id === targetHandle)
  if (!sourcePort) return { ok: false, error: `${source.nodeType} has no output "${sourceHandle ?? ''}"` }
  if (!targetPort) return { ok: false, error: `${target.nodeType} has no input "${targetHandle ?? ''}"` }

  if (!portsCompatible(sourcePort.type, targetPort.type)) {
    return {
      ok: false,
      error:
        `incompatible ports: ${source.nodeType}.${sourcePort.id} (${sourcePort.type}) → ` +
        `${target.nodeType}.${targetPort.id} (${targetPort.type})`,
    }
  }
  return { ok: true, sourcePort, targetPort }
}
