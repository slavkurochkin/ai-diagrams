import { useState } from 'react'
import { Handle, Position } from 'reactflow'
import type { PortDefinition, PortType } from '../../../types/nodes'
import { useFlowStore } from '../../../hooks/useFlowStore'

// ── Port color map ────────────────────────────────────────────────────────────

const PORT_COLORS: Record<PortType, string> = {
  text:       '#94A3B8',
  embedding:  '#0891B2',
  'tool-call':'#EA580C',
  memory:     '#CA8A04',
  structured: '#16A34A',
  any:        '#6B7280',
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface NodePortProps {
  port: PortDefinition
  side: 'input' | 'output'
  index: number
  total: number
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function NodePort({ port, side, index, total }: NodePortProps) {
  const [hovered, setHovered] = useState(false)
  const theme = useFlowStore((s) => s.theme)
  const layoutDirection = useFlowStore((s) => s.layoutDirection)
  const color = port.color ?? PORT_COLORS[port.type]
  const isInput = side === 'input'
  const isVerticalLayout = layoutDirection === 'TB'
  const position = isVerticalLayout
    ? (isInput ? Position.Top : Position.Bottom)
    : (isInput ? Position.Left : Position.Right)
  const borderColor = theme === 'dark' ? '#0F1117' : '#F8FAFC'

  // Spread handles across the active edge of the node so connectors read
  // clearly in both top-to-bottom and left-to-right layouts.
  const axisPercent = total === 1 ? 50 : 20 + (index / (total - 1)) * 60
  const handleStyle = isVerticalLayout
    ? {
        left: `${axisPercent}%`,
        top: isInput ? '-5px' : 'auto',
        bottom: isInput ? 'auto' : '-5px',
        right: 'auto',
        transform: hovered ? 'translateX(-50%) scale(1.4)' : 'translateX(-50%) scale(1)',
      }
    : {
        top: `${axisPercent}%`,
        left: isInput ? '-5px' : 'auto',
        right: isInput ? 'auto' : '-5px',
        bottom: 'auto',
        transform: hovered ? 'translateY(-50%) scale(1.4)' : 'translateY(-50%) scale(1)',
      }
  const labelStyle = isVerticalLayout
    ? {
        left: '50%',
        transform: 'translateX(-50%)',
        [isInput ? 'top' : 'bottom']: '14px',
      }
    : {
        top: '50%',
        transform: 'translateY(-50%)',
        [isInput ? 'left' : 'right']: '14px',
      }

  return (
    <Handle
      key={`${port.id}-${layoutDirection}`}
      type={isInput ? 'target' : 'source'}
      position={position}
      id={port.id}
      style={{
        background: color,
        width: 10,
        height: 10,
        border: `2px solid ${borderColor}`,
        borderRadius: '50%',
        cursor: 'crosshair',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        boxShadow: hovered ? `0 0 6px 1px ${color}80` : 'none',
        ...handleStyle,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Label tooltip on hover */}
      {hovered && (
        <span
          className="absolute text-[10px] font-medium text-white/80 bg-gray-800 border border-white/10 rounded px-1.5 py-0.5 whitespace-nowrap pointer-events-none z-50"
          style={labelStyle}
        >
          {port.label}
        </span>
      )}
    </Handle>
  )
}
