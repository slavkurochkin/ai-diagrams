import { useEffect, useMemo, useState } from 'react'
import {
  EdgeLabelRenderer,
  BaseEdge,
  Position,
  getBezierPath,
  type EdgeProps,
} from 'reactflow'
import { useFlowStore } from '../../hooks/useFlowStore'

interface Point {
  x: number
  y: number
}

type LoopLane = 'top' | 'bottom' | 'left' | 'right'
type SignalData = {
  kind?: string
  lane?: LoopLane
  activeSignalColor?: string | null
  activeSignalDuration?: number | null
  executionPriority?: number | string
  showExecutionPriority?: boolean
  pathThickness?: number | string
  pathColor?: string
}

function withOpacity(color: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha))
  const hex = color.trim()
  if (hex.startsWith('#')) {
    const normalized = hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex
    if (/^#[0-9a-fA-F]{6}$/.test(normalized)) {
      const r = parseInt(normalized.slice(1, 3), 16)
      const g = parseInt(normalized.slice(3, 5), 16)
      const b = parseInt(normalized.slice(5, 7), 16)
      return `rgba(${r}, ${g}, ${b}, ${a})`
    }
  }
  if (color.startsWith('rgb(')) {
    return color.replace('rgb(', 'rgba(').replace(')', `, ${a})`)
  }
  return color
}

function createRoundedOrthogonalPath(points: Point[], radius = 14): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

  let d = `M ${points[0].x} ${points[0].y}`

  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1]
    const curr = points[i]
    const next = points[i + 1]

    if (!next) {
      d += ` L ${curr.x} ${curr.y}`
      continue
    }

    const incomingDx = curr.x - prev.x
    const incomingDy = curr.y - prev.y
    const outgoingDx = next.x - curr.x
    const outgoingDy = next.y - curr.y
    const incomingLength = Math.hypot(incomingDx, incomingDy)
    const outgoingLength = Math.hypot(outgoingDx, outgoingDy)

    if (incomingLength === 0 || outgoingLength === 0) {
      continue
    }

    const cornerRadius = Math.min(radius, incomingLength / 2, outgoingLength / 2)
    const cornerStartX = curr.x - (incomingDx / incomingLength) * cornerRadius
    const cornerStartY = curr.y - (incomingDy / incomingLength) * cornerRadius
    const cornerEndX = curr.x + (outgoingDx / outgoingLength) * cornerRadius
    const cornerEndY = curr.y + (outgoingDy / outgoingLength) * cornerRadius

    d += ` L ${cornerStartX} ${cornerStartY}`
    d += ` Q ${curr.x} ${curr.y} ${cornerEndX} ${cornerEndY}`
  }

  return d
}

function createLoopbackPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  sourcePosition: Position,
  targetPosition: Position,
  lane: LoopLane,
): [string, number, number] {
  const horizontalPad = 56
  const verticalPad = 56
  const topLaneY = Math.min(sourceY, targetY) - 92
  const bottomLaneY = Math.max(sourceY, targetY) + 92
  const leftLaneX = Math.min(sourceX, targetX) - 92
  const rightLaneX = Math.max(sourceX, targetX) + 92

  if (sourcePosition === Position.Right && targetPosition === Position.Left) {
    const laneY = lane === 'top' ? topLaneY : bottomLaneY
    const points = [
      { x: sourceX, y: sourceY },
      { x: sourceX + horizontalPad, y: sourceY },
      { x: sourceX + horizontalPad, y: laneY },
      { x: targetX - horizontalPad, y: laneY },
      { x: targetX - horizontalPad, y: targetY },
      { x: targetX, y: targetY },
    ]
    return [createRoundedOrthogonalPath(points, 18), (sourceX + targetX) / 2, laneY]
  }

  if (sourcePosition === Position.Bottom && targetPosition === Position.Top) {
    const laneX = lane === 'left' ? leftLaneX : rightLaneX
    const points = [
      { x: sourceX, y: sourceY },
      { x: sourceX, y: sourceY + verticalPad },
      { x: laneX, y: sourceY + verticalPad },
      { x: laneX, y: targetY - verticalPad },
      { x: targetX, y: targetY - verticalPad },
      { x: targetX, y: targetY },
    ]
    return [createRoundedOrthogonalPath(points, 18), laneX, (sourceY + targetY) / 2]
  }

  const [fallbackPath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.35,
  })

  return [fallbackPath, labelX, labelY]
}

export default function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  sourceHandleId,
  targetHandleId,
  selected,
  markerEnd,
  data,
}: EdgeProps) {
  const globalPathThickness = useFlowStore((s) => s.globalPathThickness)
  const globalPathColor = useFlowStore((s) => s.globalPathColor)
  const edgeData = (data ?? {}) as SignalData
  const [hovered, setHovered] = useState(false)
  const isLoopback = edgeData.kind === 'loopback'
  const isEvalEdge = edgeData.kind === 'eval'
  const loopLane: LoopLane = edgeData.lane ?? (sourceY <= targetY ? 'top' : 'bottom')
  const signalColor = edgeData.activeSignalColor ?? null
  const [signalProgress, setSignalProgress] = useState(0)
  const showExecutionPriority = Boolean(edgeData.showExecutionPriority)
  const executionPriority = (() => {
    const raw = edgeData.executionPriority
    if (typeof raw === 'number' && Number.isFinite(raw)) return Math.max(1, Math.floor(raw))
    if (typeof raw === 'string') {
      const parsed = Number(raw)
      if (Number.isFinite(parsed)) return Math.max(1, Math.floor(parsed))
    }
    return 1
  })()
  const pathThickness = (() => {
    const raw = edgeData.pathThickness
    if (typeof raw === 'number' && Number.isFinite(raw)) return Math.max(0.5, Math.min(4, raw))
    if (typeof raw === 'string') {
      const parsed = Number(raw)
      if (Number.isFinite(parsed)) return Math.max(0.5, Math.min(4, parsed))
    }
    return 1
  })()
  const effectiveThickness = Math.max(0.5, Math.min(6, pathThickness * globalPathThickness))
  const resolvedPathColor = edgeData.pathColor || globalPathColor || '#FFFFFF'
  const isVerticalLayout =
    (sourcePosition === Position.Top || sourcePosition === Position.Bottom) &&
    (targetPosition === Position.Top || targetPosition === Position.Bottom)

  const midpointX = (sourceX + targetX) / 2
  const midpointY = (sourceY + targetY) / 2
  const axisDelta = isVerticalLayout ? Math.abs(sourceX - targetX) : Math.abs(sourceY - targetY)

  const [loopbackPath, loopLabelX, loopLabelY] = createLoopbackPath(
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    loopLane,
  )

  const edgePath = isLoopback
    ? loopbackPath
    : axisDelta < 6
      ? `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`
      : createRoundedOrthogonalPath(
          isVerticalLayout
            ? [
                { x: sourceX, y: sourceY },
                { x: sourceX, y: midpointY },
                { x: targetX, y: midpointY },
                { x: targetX, y: targetY },
              ]
            : [
                { x: sourceX, y: sourceY },
                { x: midpointX, y: sourceY },
                { x: midpointX, y: targetY },
                { x: targetX, y: targetY },
              ],
        )

  const labelX = isLoopback ? loopLabelX : midpointX
  const labelY = isLoopback ? loopLabelY : midpointY

  const label =
    sourceHandleId && targetHandleId
      ? `${sourceHandleId} → ${targetHandleId}`
      : sourceHandleId || targetHandleId || null

  const showLabel = label && (hovered || selected)

  const signalPathMetrics = useMemo(() => {
    if (typeof document === 'undefined') return null
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', edgePath)
    const totalLength = path.getTotalLength()
    if (!Number.isFinite(totalLength) || totalLength <= 0) return null
    return { path, totalLength }
  }, [edgePath])

  const signalPoint = useMemo(() => {
    if (!signalColor || !signalPathMetrics) return null
    const distance = signalPathMetrics.totalLength * signalProgress
    const pt = signalPathMetrics.path.getPointAtLength(distance)
    return { x: pt.x, y: pt.y }
  }, [signalColor, signalPathMetrics, signalProgress])
  const trailDashOffset = -136 * signalProgress
  const trailOpacity = 0.14 + (0.32 * (1 - Math.abs(signalProgress - 0.5) * 2))

  useEffect(() => {
    if (!signalColor) {
      setSignalProgress(0)
      return
    }

    let rafId = 0
    let startedAt: number | null = null
    const durationMs = Math.max(edgeData.activeSignalDuration ?? 750, 120)

    const tick = (now: number) => {
      if (startedAt === null) startedAt = now
      const elapsed = now - startedAt
      const next = Math.min(elapsed / durationMs, 1)
      setSignalProgress(next)
      if (next < 1) rafId = requestAnimationFrame(tick)
    }

    setSignalProgress(0)
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [signalColor, edgeData.activeSignalDuration, edgePath])

  return (
    <>
      {/* Wide invisible hit area for easy hover detection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={16}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="cursor-pointer"
      />

      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: selected
            ? withOpacity(resolvedPathColor, isLoopback ? 0.9 : isEvalEdge ? 0.75 : 0.8)
            : hovered
              ? withOpacity(resolvedPathColor, isLoopback ? 0.7 : isEvalEdge ? 0.55 : 0.55)
              : withOpacity(resolvedPathColor, isLoopback ? 0.35 : isEvalEdge ? 0.2 : 0.2),
          strokeWidth: (hovered || selected ? 2 : isEvalEdge ? 1.15 : 1.5) * effectiveThickness,
          strokeDasharray: isLoopback ? '5 6' : isEvalEdge ? '2 6' : undefined,
          transition: 'stroke 0.15s ease, stroke-width 0.15s ease, stroke-dasharray 0.15s ease',
        }}
      />

      {signalColor && (
        <>
          {/* Animated lane overlay makes signal travel obvious during playback */}
          <path
            d={edgePath}
            fill="none"
            stroke={signalColor}
            strokeWidth={4}
            strokeOpacity={trailOpacity}
            strokeDasharray="18 16"
            strokeDashoffset={trailDashOffset}
            strokeLinecap="round"
          />

          {signalPoint && (
            <>
              <circle cx={signalPoint.x} cy={signalPoint.y} r={14} fill={signalColor} fillOpacity={0.28} />
              <circle cx={signalPoint.x} cy={signalPoint.y} r={8} fill={signalColor} fillOpacity={0.96} />
              <circle cx={signalPoint.x} cy={signalPoint.y} r={4} fill="#FFFFFF" fillOpacity={0.98} />
            </>
          )}
        </>
      )}

      {showLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'none',
              zIndex: 10,
            }}
            className="nodrag nopan"
          >
            <div
              className="
                px-2 py-0.5 rounded-full
                bg-gray-950/95 border border-white/15
                text-[10px] font-mono text-white/55
                whitespace-nowrap backdrop-blur-sm
                shadow-lg
              "
            >
              {label}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}

      {showExecutionPriority && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY + 16}px)`,
              pointerEvents: 'none',
              zIndex: 11,
            }}
            className="nodrag nopan"
          >
            <div
              className="
                px-2 py-0.5 rounded-full
                bg-cyan-950/95 border border-cyan-400/35
                text-[10px] font-mono text-cyan-200
                whitespace-nowrap backdrop-blur-sm
                shadow-lg
              "
            >
              {`P${executionPriority}`}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}

    </>
  )
}
