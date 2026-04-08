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
    const escapedId = typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
      ? CSS.escape(edgeId)
      : edgeId.replace(/[^a-zA-Z0-9_-]/g, '\\$&')

    // React Flow identifiers differ slightly across versions, so probe multiple selectors.
    const edgeEl = (
      document.querySelector(`.react-flow__edge[data-id="${edgeId}"] .react-flow__edge-path`) ??
      document.querySelector(`#reactflow__edge-${escapedId} .react-flow__edge-path`) ??
      document.querySelector(`.react-flow__edge-${escapedId} .react-flow__edge-path`) ??
      document.querySelector(`.react-flow__edge[data-id="${edgeId}"] path`) ??
      document.querySelector(`#reactflow__edge-${escapedId} path`) ??
      document.querySelector(`.react-flow__edge-${escapedId} path`)
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
      {/* Moving dashed trail makes direction of travel obvious */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeOpacity={0.12}
        strokeDasharray="14 18"
        strokeLinecap="round"
      >
        <animate
          attributeName="stroke-opacity"
          dur={durSec}
          values="0.04;0.55;0.08"
          keyTimes="0;0.5;1"
          calcMode="spline"
          keySplines="0.42 0 0.58 1;0.4 0 0.2 1"
          fill="freeze"
        />
        <animate
          attributeName="stroke-dashoffset"
          dur={durSec}
          from="0"
          to="-72"
          fill="freeze"
        />
      </path>

      {/* Glow halo */}
      <circle r={10} fill={color} fillOpacity={0.3}>
        <animateMotion dur={durSec} path={pathD} fill="freeze" calcMode="spline"
          keyTimes="0;1" keySplines="0.4 0 0.2 1" />
      </circle>
      {/* Core dot */}
      <circle r={6} fill={color} filter="url(#token-glow)">
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
