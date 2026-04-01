import { useEffect, useRef, useState } from 'react'

interface DataTokenProps {
  edgeId: string
  color: string
  duration: number  // ms
}

/**
 * An animated dot that travels along a React Flow edge path.
 *
 * Strategy: query the DOM for the edge's SVG path element, read its `d`
 * attribute (which is in flow-space coordinates), then use SVG
 * <animateMotion> inside a sibling SVG overlay that has the same viewport
 * transform applied via a <g> wrapper.
 */
export default function DataToken({ edgeId, color, duration }: DataTokenProps) {
  const [pathD, setPathD] = useState<string | null>(null)
  const animRef = useRef<SVGAnimateMotionElement | null>(null)

  useEffect(() => {
    // React Flow renders edge paths with data-id attribute on the <g>
    const edgeEl = document.querySelector(
      `.react-flow__edge[data-id="${edgeId}"] .react-flow__edge-path`,
    ) as SVGPathElement | null

    const d = edgeEl?.getAttribute('d') ?? null
    setPathD(d)
  }, [edgeId])

  // Restart animation when pathD becomes available
  useEffect(() => {
    if (pathD && animRef.current) {
      try {
        ;(animRef.current as SVGAnimateMotionElement & { beginElement(): void }).beginElement()
      } catch {
        // beginElement not available in all environments
      }
    }
  }, [pathD])

  if (!pathD) return null

  const durSec = (duration / 1000).toFixed(2) + 's'

  return (
    <g>
      {/* Glow halo */}
      <circle r={9} fill={color} fillOpacity={0.25}>
        <animateMotion dur={durSec} path={pathD} fill="freeze" calcMode="spline"
          keyTimes="0;1" keySplines="0.4 0 0.2 1" />
      </circle>
      {/* Core dot */}
      <circle r={5} fill={color} filter="url(#token-glow)">
        <animateMotion
          ref={animRef}
          dur={durSec}
          path={pathD}
          fill="freeze"
          calcMode="spline"
          keyTimes="0;1"
          keySplines="0.4 0 0.2 1"
        />
      </circle>
    </g>
  )
}
