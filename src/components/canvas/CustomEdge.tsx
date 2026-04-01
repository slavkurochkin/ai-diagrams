import { useState } from 'react'
import {
  EdgeLabelRenderer,
  BaseEdge,
  Position,
  getBezierPath,
  type EdgeProps,
} from 'reactflow'

interface Point {
  x: number
  y: number
}

type LoopLane = 'top' | 'bottom' | 'left' | 'right'

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
  const [hovered, setHovered] = useState(false)
  const isLoopback = data?.kind === 'loopback'
  const isEvalEdge = data?.kind === 'eval'
  const loopLane: LoopLane = data?.lane ?? (sourceY <= targetY ? 'top' : 'bottom')
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
          stroke: isLoopback
            ? selected
              ? '#38BDF8dd'
              : hovered
                ? '#38BDF8aa'
                : '#38BDF84d'
            : isEvalEdge
              ? selected
                ? '#94A3B8aa'
                : hovered
                  ? '#94A3B866'
                  : '#94A3B833'
            : selected
              ? '#7C3AEDcc'
              : hovered
                ? '#ffffff55'
                : '#ffffff20',
          strokeWidth: hovered || selected ? 2 : isEvalEdge ? 1.15 : 1.5,
          strokeDasharray: isLoopback ? '5 6' : isEvalEdge ? '2 6' : undefined,
          transition: 'stroke 0.15s ease, stroke-width 0.15s ease, stroke-dasharray 0.15s ease',
        }}
      />

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
    </>
  )
}
