import { useCallback } from 'react'
import { NodeResizer, type NodeProps } from 'reactflow'
import { useFlowStore } from '../../hooks/useFlowStore'
import type { BaseNodeData } from '../../types/nodes'

const MIN_SIZE = 60
const DEFAULT_W = 90
const DEFAULT_H = 110

function coerceSize(value: unknown, fallback: number, min: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(min, value)
  if (typeof value === 'string') {
    const n = Number(value)
    if (Number.isFinite(n)) return Math.max(min, n)
  }
  return fallback
}

// ── SVG characters ────────────────────────────────────────────────────────────

interface SvgProps {
  color: string
  hairColor?: string
  dressColor?: string
}

function PersonSvg({ color }: SvgProps) {
  return (
    <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color, width: '100%', height: '100%' }}>
      <circle cx="40" cy="17" r="11" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.13" />
      <line x1="40" y1="28" x2="40" y2="60" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M40 42 L22 56" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M40 42 L58 56" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M40 60 L28 82" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M40 60 L52 82" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function WomanSvg({ color, hairColor = '#a0522d', dressColor = '#6b7db3' }: SvgProps) {
  return (
    <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      {/* Long hair — left, drawn behind head */}
      <path d="M31 11 Q14 20 13 64" stroke={hairColor} strokeWidth="6" strokeLinecap="round" />
      {/* Long hair — right, drawn behind head */}
      <path d="M49 11 Q66 20 67 64" stroke={hairColor} strokeWidth="6" strokeLinecap="round" />
      {/* Hair crown — arc over top of head */}
      <path d="M27 16 Q28 4 40 4 Q52 4 53 16" stroke={hairColor} strokeWidth="4.5" strokeLinecap="round" fill="none" />
      {/* Head */}
      <circle cx="40" cy="17" r="12" stroke={color} strokeWidth="2.5" fill={color} fillOpacity="0.13" />
      {/* A-line dress */}
      <path d="M32 29 L18 73 L62 73 L48 29 Z" stroke={dressColor} strokeWidth="2" fill={dressColor} fillOpacity="0.22" strokeLinejoin="round" />
      {/* Waist seam */}
      <path d="M28 44 L52 44" stroke={dressColor} strokeWidth="1.8" strokeLinecap="round" />
      {/* Arms (skin color) */}
      <path d="M33 33 L14 53" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M47 33 L66 53" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {/* Legs */}
      <path d="M26 73 L22 91" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M54 73 L58 91" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function ManSvg({ color }: SvgProps) {
  return (
    <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color, width: '100%', height: '100%' }}>
      <circle cx="40" cy="14" r="11" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.13" />
      {/* Suit jacket */}
      <path d="M29 25 L24 58 L56 58 L51 25 Z" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.10" strokeLinejoin="round" />
      {/* Lapels */}
      <path d="M40 27 Q36 34 29 37" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M40 27 Q44 34 51 37" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      {/* Tie */}
      <path d="M40 27 L37.5 44 L40 48 L42.5 44 Z" fill="currentColor" fillOpacity="0.38" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
      {/* Wide arms */}
      <path d="M29 30 L10 54" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M51 30 L70 54" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Pants */}
      <path d="M31 58 L26 84" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M49 58 L54 84" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M36 71 L44 71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function DogSvg({ color }: SvgProps) {
  return (
    <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color, width: '100%', height: '100%' }}>
      <ellipse cx="35" cy="62" rx="21" ry="13" stroke="currentColor" strokeWidth="2.2" fill="currentColor" fillOpacity="0.10" />
      <circle cx="57" cy="40" r="13" stroke="currentColor" strokeWidth="2.2" fill="currentColor" fillOpacity="0.10" />
      <path d="M48 30 Q40 22 38 36" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="currentColor" fillOpacity="0.12" />
      <circle cx="60" cy="36" r="2" fill="currentColor" />
      <ellipse cx="69" cy="44" rx="3" ry="2" fill="currentColor" fillOpacity="0.7" />
      <path d="M14 58 Q4 44 10 30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M50 73 L48 89" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M40 74 L38 90" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M24 73 L21 89" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M14 70 L11 86" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function CatSvg({ color }: SvgProps) {
  return (
    <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color, width: '100%', height: '100%' }}>
      <ellipse cx="38" cy="65" rx="18" ry="13" stroke="currentColor" strokeWidth="2.2" fill="currentColor" fillOpacity="0.10" />
      <circle cx="40" cy="34" r="16" stroke="currentColor" strokeWidth="2.2" fill="currentColor" fillOpacity="0.10" />
      <path d="M28 22 L23 10 L36 20" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="currentColor" fillOpacity="0.15" />
      <path d="M52 22 L57 10 L44 20" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="currentColor" fillOpacity="0.15" />
      <ellipse cx="34" cy="32" rx="2.5" ry="3" fill="currentColor" />
      <ellipse cx="46" cy="32" rx="2.5" ry="3" fill="currentColor" />
      <path d="M38 39 L40 41 L42 39 Q40 43 38 39 Z" fill="currentColor" />
      <path d="M26 39 L36 40 M25 42 L36 42" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M54 39 L44 40 M55 42 L44 42" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M20 65 Q8 72 10 84 Q12 92 22 88" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M30 76 L28 90" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M44 76 L46 90" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function RobotSvg({ color }: SvgProps) {
  return (
    <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color, width: '100%', height: '100%' }}>
      <line x1="40" y1="6" x2="40" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="40" cy="5" r="3" fill="currentColor" />
      <rect x="26" y="15" width="28" height="22" rx="4" stroke="currentColor" strokeWidth="2.2" fill="currentColor" fillOpacity="0.10" />
      <rect x="30" y="20" width="7" height="6" rx="1.5" fill="currentColor" fillOpacity="0.55" />
      <rect x="43" y="20" width="7" height="6" rx="1.5" fill="currentColor" fillOpacity="0.55" />
      <path d="M32 32 L48 32" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="40" y1="37" x2="40" y2="44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="24" y="44" width="32" height="26" rx="4" stroke="currentColor" strokeWidth="2.2" fill="currentColor" fillOpacity="0.10" />
      <circle cx="40" cy="57" r="5" stroke="currentColor" strokeWidth="1.8" fill="currentColor" fillOpacity="0.18" />
      <path d="M24 50 L13 64" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M56 50 L67 64" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M34 70 L31 88" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M46 70 L49 88" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function KidSvg({ color }: SvgProps) {
  return (
    <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color, width: '100%', height: '100%' }}>
      <circle cx="40" cy="20" r="15" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.13" />
      <line x1="40" y1="35" x2="40" y2="58" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M40 43 L24 54" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M40 43 L56 54" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M40 58 L30 76" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M40 58 L50 76" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

// ── Character map ─────────────────────────────────────────────────────────────

const CHARACTER_SVGS: Record<string, (props: SvgProps) => JSX.Element> = {
  person: PersonSvg,
  woman:  WomanSvg,
  man:    ManSvg,
  dog:    DogSvg,
  cat:    CatSvg,
  robot:  RobotSvg,
  kid:    KidSvg,
}

export const CHARACTER_VARIANTS = [
  { key: 'person', label: 'Person'  },
  { key: 'woman',  label: 'Woman'   },
  { key: 'man',    label: 'Man'     },
  { key: 'dog',    label: 'Dog'     },
  { key: 'cat',    label: 'Cat'     },
  { key: 'robot',  label: 'Robot'   },
  { key: 'kid',    label: 'Kid'     },
]

// ── CharacterNode component ───────────────────────────────────────────────────

export default function CharacterNode({ id, data, selected }: NodeProps<BaseNodeData>) {
  const setSelectedNode = useFlowStore((s) => s.setSelectedNode)
  const setNodes        = useFlowStore((s) => s.setNodes)

  const config    = data.config as Record<string, unknown>
  const variant   = typeof config.variant   === 'string' ? config.variant   : 'person'
  const hairColor = typeof config.hairColor === 'string' ? config.hairColor : '#a0522d'
  const dressColor = typeof config.dressColor === 'string' ? config.dressColor : '#6b7db3'
  const width     = coerceSize(config.width,  DEFAULT_W, MIN_SIZE)
  const height    = coerceSize(config.height, DEFAULT_H, MIN_SIZE)
  const color     = data.accentColor ?? '#94a3b8'

  const SvgChar = CHARACTER_SVGS[variant] ?? PersonSvg

  const handleResizeEnd = useCallback(
    (_event: unknown, params: { width: number; height: number }) => {
      const nextW = Math.round(Math.max(MIN_SIZE, params.width))
      const nextH = Math.round(Math.max(MIN_SIZE, params.height))
      const nodes = useFlowStore.getState().nodes
      setNodes(nodes.map((n) => {
        if (n.id !== id) return n
        return {
          ...n,
          style: { ...n.style, width: nextW, height: nextH },
          data: { ...n.data, config: { ...n.data.config, width: nextW, height: nextH } },
        }
      }))
    },
    [id, setNodes],
  )

  return (
    <div
      className="relative cursor-pointer select-none"
      style={{ width, height }}
      onMouseDown={() => setSelectedNode(id)}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={MIN_SIZE}
        minHeight={MIN_SIZE}
        lineClassName="!border-slate-400/40"
        handleClassName="!w-3 !h-3 !rounded-sm !border !border-white/50 !bg-slate-700/90"
        onResizeEnd={handleResizeEnd}
      />
      {selected && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{ boxShadow: `0 0 0 1.5px ${color}88, 0 0 12px 2px ${color}30` }}
        />
      )}
      <SvgChar color={color} hairColor={hairColor} dressColor={dressColor} />
    </div>
  )
}
