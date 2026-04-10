import { useCallback, useRef, useState } from 'react'
import { Handle, Position, useNodeId, useUpdateNodeInternals } from 'reactflow'
import type { PortDefinition } from '../../../types/nodes'
import { useFlowStore } from '../../../hooks/useFlowStore'
import { resolvePortAxisPercent } from '../../../lib/portLayout'
import { portHandleFill } from '../../../lib/portVisual'

// ── Props ─────────────────────────────────────────────────────────────────────

interface NodePortProps {
  port: PortDefinition
  side: 'input' | 'output'
  index: number
  total: number
  portOffsets?: Record<string, number>
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function NodePort({ port, side, index, total, portOffsets }: NodePortProps) {
  const [hovered, setHovered] = useState(false)
  const nodeId = useNodeId()
  const updateNodeInternals = useUpdateNodeInternals()
  const draggingRef = useRef(false)
  const theme = useFlowStore((s) => s.theme)
  const layoutDirection = useFlowStore((s) => s.layoutDirection)
  const isInput = side === 'input'
  const color = port.color ?? portHandleFill(port.type, side)
  const isVerticalLayout = layoutDirection === 'TB'
  const position = isVerticalLayout
    ? (isInput ? Position.Top : Position.Bottom)
    : (isInput ? Position.Left : Position.Right)
  const borderColor = theme === 'dark' ? '#0F1117' : '#F8FAFC'

  const axisPercent = resolvePortAxisPercent(port, index, total, portOffsets)
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

  const applyPercentFromPointer = useCallback(
    (clientX: number, clientY: number, fromEl: HTMLElement | null) => {
      const nodeEl =
        fromEl?.closest<HTMLElement>('.react-flow__node') ??
        (nodeId
          ? document.querySelector<HTMLElement>(`.react-flow__node[data-id="${nodeId}"]`)
          : null)
      if (!nodeEl) return
      const r = nodeEl.getBoundingClientRect()
      if (r.width <= 0 || r.height <= 0) return
      const pct = isVerticalLayout
        ? ((clientX - r.left) / r.width) * 100
        : ((clientY - r.top) / r.height) * 100
      const clamped = Math.max(0, Math.min(100, pct))
      if (nodeId) {
        useFlowStore.getState().updateNodePortOffset(nodeId, port.id, clamped)
        updateNodeInternals(nodeId)
      }
    },
    [nodeId, port.id, isVerticalLayout, updateNodeInternals],
  )

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!e.altKey) return
      e.preventDefault()
      e.stopPropagation()
      draggingRef.current = true
      ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
      applyPercentFromPointer(e.clientX, e.clientY, e.currentTarget as HTMLElement)
    },
    [applyPercentFromPointer],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return
      e.preventDefault()
      applyPercentFromPointer(e.clientX, e.clientY, e.currentTarget as HTMLElement)
    },
    [applyPercentFromPointer],
  )

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return
    draggingRef.current = false
    try {
      ;(e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }, [])

  return (
    <Handle
      key={`${port.id}-${layoutDirection}`}
      type={isInput ? 'target' : 'source'}
      position={position}
      id={port.id}
      className="nodrag"
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
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      aria-label={`${port.label}. Option or Alt-drag to slide, or use sliders under Ports.`}
    >
      {hovered && (
        <div
          className="
            absolute z-50 max-w-[min(230px,calc(100vw-1rem))] rounded-sm border border-white/10 bg-gray-800
            px-1.5 py-1 text-left text-[9px] font-medium text-white/85 shadow-sm pointer-events-none
          "
          style={labelStyle}
        >
          <span className="block truncate leading-tight" title={port.label}>
            {port.label}
          </span>
          <span className="mt-px block whitespace-nowrap text-[8px] font-normal leading-tight text-white/40">
            Option/Alt + drag · sliders
          </span>
        </div>
      )}
    </Handle>
  )
}
