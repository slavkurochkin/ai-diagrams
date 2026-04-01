import { useViewport } from 'reactflow'
import DataToken from './DataToken'

interface ActiveEdge {
  edgeId: string
  color: string
  duration: number
}

interface FlowPlayerProps {
  activeEdges: ActiveEdge[]
}

/**
 * Renders animated data tokens on top of the React Flow canvas.
 *
 * Uses an absolutely-positioned SVG overlay with a <g> whose CSS transform
 * mirrors the React Flow viewport (pan + zoom), so token positions stay
 * locked to edge paths even when the user pans or zooms.
 */
export default function FlowPlayer({ activeEdges }: FlowPlayerProps) {
  const { x, y, zoom } = useViewport()

  if (activeEdges.length === 0) return null

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ width: '100%', height: '100%', overflow: 'visible' }}
    >
      <defs>
        <filter id="token-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Mirror the React Flow viewport transform so tokens track edges */}
      <g style={{ transform: `translate(${x}px, ${y}px) scale(${zoom})` }}>
        {activeEdges.map(({ edgeId, color, duration }) => (
          <DataToken key={edgeId} edgeId={edgeId} color={color} duration={duration} />
        ))}
      </g>
    </svg>
  )
}
