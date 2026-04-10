import type { PortDefinition } from '../types/nodes'

const SPREAD_LO = 20
const SPREAD_HI = 80

/** Match ports to canvas order (same as sidebar Port order). */
export function sortPortsByOrder(ports: PortDefinition[], order?: string[]): PortDefinition[] {
  if (!order || order.length === 0) return ports
  const byId = Object.fromEntries(ports.map((p) => [p.id, p]))
  const ordered = order.map((id) => byId[id]).filter((p): p is PortDefinition => p != null)
  const rest = ports.filter((p) => !order.includes(p.id))
  return [...ordered, ...rest]
}

export function resolvePortAxisPercent(
  port: PortDefinition,
  index: number,
  total: number,
  portOffsets?: Record<string, number> | undefined,
): number {
  const raw = portOffsets?.[port.id]
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.max(0, Math.min(100, raw))
  }
  if (typeof port.edgeOffsetPercent === 'number' && Number.isFinite(port.edgeOffsetPercent)) {
    return Math.max(0, Math.min(100, port.edgeOffsetPercent))
  }
  if (total <= 1) return 50
  return SPREAD_LO + (index / (total - 1)) * (SPREAD_HI - SPREAD_LO)
}

export function portAxisPercentToPixelOffset(axisPercent: number, span: number): number {
  return (axisPercent / 100) * span
}
