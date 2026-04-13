import { useState, useRef, useCallback, useEffect } from 'react'
import { MousePointer2, Pen, ArrowRight, Circle, Trash2 } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

type DrawTool = 'laser' | 'pen' | 'arrow' | 'circle' | null

type PenStroke    = { type: 'pen';    points: [number, number][]; color: string }
type ArrowStroke  = { type: 'arrow';  x1: number; y1: number; x2: number; y2: number; color: string }
type CircleStroke = { type: 'circle'; cx: number; cy: number; rx: number; ry: number; color: string }
type Stroke = PenStroke | ArrowStroke | CircleStroke

// ── Constants ────────────────────────────────────────────────────────────────

const COLORS: string[] = ['#FF4444', '#FFDD00', '#00DDFF', '#FFFFFF']

// ── Stroke renderer ──────────────────────────────────────────────────────────

function RenderStroke({ stroke }: { stroke: Stroke }) {
  const base = {
    fill: 'none',
    stroke: stroke.color,
    strokeWidth: 2.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  if (stroke.type === 'pen') {
    if (stroke.points.length < 2) return null
    const d = stroke.points.reduce(
      (acc, [x, y], i) => acc + (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`),
      '',
    )
    return <path d={d} {...base} />
  }

  if (stroke.type === 'arrow') {
    const dx = stroke.x2 - stroke.x1
    const dy = stroke.y2 - stroke.y1
    if (Math.hypot(dx, dy) < 8) return null
    return (
      <line
        x1={stroke.x1} y1={stroke.y1}
        x2={stroke.x2} y2={stroke.y2}
        {...base}
        markerEnd={`url(#arrowhead-${stroke.color.slice(1)})`}
      />
    )
  }

  if (stroke.type === 'circle') {
    if (stroke.rx < 5 || stroke.ry < 5) return null
    return (
      <ellipse
        cx={stroke.cx} cy={stroke.cy}
        rx={stroke.rx} ry={stroke.ry}
        {...base}
        strokeDasharray="10 5"
      />
    )
  }

  return null
}

// ── Tool button ──────────────────────────────────────────────────────────────

function ToolBtn({
  active, onClick, title, children,
}: {
  active: boolean; onClick: () => void; title: string; children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-md transition-colors ${
        active ? 'bg-white/20 text-white' : 'text-white/45 hover:text-white hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function DrawingOverlay() {
  const [tool, setTool]         = useState<DrawTool>(null)
  const [color, setColor]       = useState(COLORS[0])
  const [strokes, setStrokes]   = useState<Stroke[]>([])
  const [active, setActive]     = useState<Stroke | null>(null)
  const [laserPos, setLaserPos] = useState<{ x: number; y: number } | null>(null)

  const svgRef    = useRef<SVGSVGElement>(null)
  const isDrawing = useRef(false)
  const startPos  = useRef<{ x: number; y: number } | null>(null)
  const toolRef   = useRef(tool)
  useEffect(() => { toolRef.current = tool }, [tool])

  // Hide system cursor when laser is active
  useEffect(() => {
    if (tool !== 'laser') return
    const style = document.createElement('style')
    style.textContent = '* { cursor: none !important; }'
    document.head.appendChild(style)
    return () => { document.head.removeChild(style) }
  }, [tool])

  // Laser: track via window so pointer events are not captured
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (toolRef.current !== 'laser') return
      const rect = svgRef.current?.getBoundingClientRect()
      if (!rect) return
      if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
        setLaserPos(null); return
      }
      setLaserPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    }
    const onLeave = () => setLaserPos(null)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseleave', onLeave)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseleave', onLeave) }
  }, [])

  const svgPos = (e: React.MouseEvent) => {
    const rect = svgRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const pos = svgPos(e)
    isDrawing.current = true
    startPos.current = pos
    if (tool === 'pen') {
      setActive({ type: 'pen', points: [[pos.x, pos.y]], color })
    } else if (tool === 'arrow') {
      setActive({ type: 'arrow', x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y, color })
    } else if (tool === 'circle') {
      setActive({ type: 'circle', cx: pos.x, cy: pos.y, rx: 0, ry: 0, color })
    }
  }, [tool, color])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing.current || !startPos.current) return
    const pos = svgPos(e)
    if (tool === 'pen') {
      setActive((prev) => prev?.type === 'pen' ? { ...prev, points: [...prev.points, [pos.x, pos.y]] } : prev)
    } else if (tool === 'arrow') {
      setActive((prev) => prev?.type === 'arrow' ? { ...prev, x2: pos.x, y2: pos.y } : prev)
    } else if (tool === 'circle') {
      const cx = (startPos.current!.x + pos.x) / 2
      const cy = (startPos.current!.y + pos.y) / 2
      const rx = Math.abs(pos.x - startPos.current!.x) / 2
      const ry = Math.abs(pos.y - startPos.current!.y) / 2
      setActive({ type: 'circle', cx, cy, rx, ry, color })
    }
  }, [tool, color])

  const commit = useCallback(() => {
    if (!isDrawing.current) return
    isDrawing.current = false
    startPos.current = null
    setActive((prev) => { if (prev) setStrokes((s) => [...s, prev]); return null })
  }, [])

  const isCapturing = tool === 'pen' || tool === 'arrow' || tool === 'circle'

  return (
    <>
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: isCapturing ? 'all' : 'none', cursor: isCapturing ? 'crosshair' : 'default', zIndex: 20 }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={commit}
        onMouseLeave={commit}
      >
        <defs>
          {COLORS.map((c) => (
            <marker key={c} id={`arrowhead-${c.slice(1)}`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0,10 3.5,0 7" fill={c} />
            </marker>
          ))}
        </defs>

        {strokes.map((s, i) => <RenderStroke key={i} stroke={s} />)}
        {active && <RenderStroke stroke={active} />}

        {tool === 'laser' && laserPos !== null && (
          <g style={{ pointerEvents: 'none' }}>
            <circle cx={laserPos.x} cy={laserPos.y} r={18} fill={color} opacity={0.08} />
            <circle cx={laserPos.x} cy={laserPos.y} r={9}  fill={color} opacity={0.22} />
            <circle cx={laserPos.x} cy={laserPos.y} r={4}  fill={color} opacity={0.70} />
            <circle cx={laserPos.x} cy={laserPos.y} r={1.5} fill="white" opacity={0.95} />
          </g>
        )}
      </svg>

      <div className="absolute bottom-6 left-6 z-30 flex flex-col items-start gap-1.5">
      {tool && (
        <div className="px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm text-[10px] text-white/40 select-none">
          Click again to deselect
        </div>
      )}
      <div className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-black/55 backdrop-blur-sm border border-white/10 shadow-xl">
        <ToolBtn active={tool === 'laser'} onClick={() => setTool((t) => t === 'laser' ? null : 'laser')} title="Laser pointer">
          <MousePointer2 size={13} />
        </ToolBtn>
        <ToolBtn active={tool === 'pen'} onClick={() => setTool((t) => t === 'pen' ? null : 'pen')} title="Freehand">
          <Pen size={13} />
        </ToolBtn>
        <ToolBtn active={tool === 'arrow'} onClick={() => setTool((t) => t === 'arrow' ? null : 'arrow')} title="Arrow">
          <ArrowRight size={13} />
        </ToolBtn>
        <ToolBtn active={tool === 'circle'} onClick={() => setTool((t) => t === 'circle' ? null : 'circle')} title="Circle highlight">
          <Circle size={13} />
        </ToolBtn>

        <div className="w-px h-4 bg-white/15 mx-0.5" />

        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            className="w-3.5 h-3.5 rounded-full transition-transform hover:scale-125 shrink-0"
            style={{
              background: c,
              outline: color === c ? '2px solid rgba(255,255,255,0.8)' : '2px solid transparent',
              outlineOffset: '1.5px',
            }}
          />
        ))}

        <div className="w-px h-4 bg-white/15 mx-0.5" />

        <ToolBtn active={false} onClick={() => { setStrokes([]); setActive(null) }} title="Clear all">
          <Trash2 size={13} />
        </ToolBtn>
      </div>
      </div>
    </>
  )
}
