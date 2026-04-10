import type { PortType } from '../types/nodes'

/** All input handles use the same blue (type is ignored for color; use `port.color` on the definition to override). */
const INPUT_BLUE = '#3B82F6'

const OUTPUT = '#22C55E'

export function portHandleFill(_type: PortType, side: 'input' | 'output'): string {
  if (side === 'output') return OUTPUT
  return INPUT_BLUE
}
