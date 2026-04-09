import { useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
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

function hexToRgba(hex: string, alpha: number): string {
  const raw = hex.trim()
  const match = raw.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
  if (!match) return `rgba(240, 249, 255, ${alpha})`
  const value = match[1]
  const expanded = value.length === 3
    ? value.split('').map((c) => c + c).join('')
    : value
  const r = Number.parseInt(expanded.slice(0, 2), 16)
  const g = Number.parseInt(expanded.slice(2, 4), 16)
  const b = Number.parseInt(expanded.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function mixWithWhite(hex: string, amount: number): string {
  const raw = hex.trim()
  const match = raw.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
  if (!match) return '#ffffff'
  const value = match[1]
  const expanded = value.length === 3
    ? value.split('').map((c) => c + c).join('')
    : value
  const r = Number.parseInt(expanded.slice(0, 2), 16)
  const g = Number.parseInt(expanded.slice(2, 4), 16)
  const b = Number.parseInt(expanded.slice(4, 6), 16)
  const clamp = Math.max(0, Math.min(1, amount))
  const nr = Math.round(r + (255 - r) * clamp)
  const ng = Math.round(g + (255 - g) * clamp)
  const nb = Math.round(b + (255 - b) * clamp)
  const toHex = (n: number) => n.toString(16).padStart(2, '0')
  return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`
}

// ── Expression face renderer ──────────────────────────────────────────────────
// renderFace: full face (eyes + mouth) — used by person, girl, dog, kid
// renderMouth: mouth only — used by cat (has slit eyes) and robot (has lens eyes)

function renderFace(cx: number, cy: number, r: number, expression: string): JSX.Element | null {
  if (!expression || expression === 'none') return null

  const lx  = cx - r * 0.28
  const rx  = cx + r * 0.28
  const eyY = cy - r * 0.14
  const er  = r * 0.13
  const mY  = cy + r * 0.22
  const mW  = r * 0.36

  switch (expression) {
    case 'happy':
      return (
        <g>
          <circle cx={lx} cy={eyY} r={er} fill="currentColor" />
          <circle cx={rx} cy={eyY} r={er} fill="currentColor" />
          <path d={`M${lx - er} ${mY} Q${cx} ${mY + r * 0.22} ${rx + er} ${mY}`}
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        </g>
      )
    case 'sad':
      return (
        <g>
          <circle cx={lx} cy={eyY} r={er} fill="currentColor" />
          <circle cx={rx} cy={eyY} r={er} fill="currentColor" />
          <path d={`M${lx - er} ${mY + r * 0.18} Q${cx} ${mY} ${rx + er} ${mY + r * 0.18}`}
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        </g>
      )
    case 'angry':
      return (
        <g>
          {/* Furrowed brows */}
          <path d={`M${lx - er} ${eyY - r * 0.22} L${lx + er * 1.2} ${eyY - r * 0.06}`}
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d={`M${rx + er} ${eyY - r * 0.22} L${rx - er * 1.2} ${eyY - r * 0.06}`}
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx={lx} cy={eyY} r={er} fill="currentColor" />
          <circle cx={rx} cy={eyY} r={er} fill="currentColor" />
          <path d={`M${lx - er} ${mY + r * 0.14} Q${cx} ${mY} ${rx + er} ${mY + r * 0.14}`}
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        </g>
      )
    case 'surprised':
      return (
        <g>
          <circle cx={lx} cy={eyY} r={er * 1.7} stroke="currentColor" strokeWidth="1.4"
            fill="currentColor" fillOpacity="0.25" />
          <circle cx={rx} cy={eyY} r={er * 1.7} stroke="currentColor" strokeWidth="1.4"
            fill="currentColor" fillOpacity="0.25" />
          <ellipse cx={cx} cy={mY + r * 0.08} rx={r * 0.13} ry={r * 0.16}
            stroke="currentColor" strokeWidth="1.4" fill="currentColor" fillOpacity="0.2" />
        </g>
      )
    case 'neutral':
      return (
        <g>
          <circle cx={lx} cy={eyY} r={er} fill="currentColor" />
          <circle cx={rx} cy={eyY} r={er} fill="currentColor" />
          <path d={`M${cx - mW * 0.8} ${mY + r * 0.1} L${cx + mW * 0.8} ${mY + r * 0.1}`}
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </g>
      )
    case 'thinking':
      return (
        <g>
          <circle cx={lx} cy={eyY} r={er} fill="currentColor" />
          {/* One eye squinted */}
          <path d={`M${rx - er * 1.2} ${eyY} Q${rx} ${eyY - er * 1.2} ${rx + er * 1.2} ${eyY}`}
            stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          {/* Pursed mouth — shifted slightly to side */}
          <path d={`M${cx - er} ${mY + r * 0.1} Q${cx + r * 0.2} ${mY} ${cx + mW * 0.7} ${mY + r * 0.05}`}
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        </g>
      )
    default:
      return null
  }
}

function renderMouth(cx: number, cy: number, r: number, expression: string): JSX.Element | null {
  if (!expression || expression === 'none') return null

  const lx = cx - r * 0.36
  const rx = cx + r * 0.36
  const mY = cy + r * 0.22

  switch (expression) {
    case 'happy':
      return (
        <path d={`M${lx} ${mY} Q${cx} ${mY + r * 0.22} ${rx} ${mY}`}
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      )
    case 'sad':
      return (
        <path d={`M${lx} ${mY + r * 0.18} Q${cx} ${mY} ${rx} ${mY + r * 0.18}`}
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      )
    case 'angry':
      return (
        <path d={`M${lx} ${mY + r * 0.14} Q${cx} ${mY} ${rx} ${mY + r * 0.14}`}
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      )
    case 'surprised':
      return (
        <ellipse cx={cx} cy={mY + r * 0.08} rx={r * 0.13} ry={r * 0.16}
          stroke="currentColor" strokeWidth="1.4" fill="currentColor" fillOpacity="0.2" />
      )
    case 'neutral':
      return (
        <path d={`M${lx * 0.85 + cx * 0.15} ${mY + r * 0.1} L${rx * 0.85 + cx * 0.15} ${mY + r * 0.1}`}
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      )
    case 'thinking':
      return (
        <path d={`M${cx - r * 0.1} ${mY + r * 0.08} Q${cx + r * 0.2} ${mY} ${cx + r * 0.38} ${mY + r * 0.04}`}
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      )
    default:
      return null
  }
}

// ── SVG characters ────────────────────────────────────────────────────────────

interface SvgProps {
  color: string
  hairColor?: string
  dressColor?: string
  expression?: string
}

function PersonSvg({ color, expression = 'none' }: SvgProps) {
  return (
    <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color, width: '100%', height: '100%' }}>
      <circle cx="40" cy="17" r="11" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.13" />
      {renderFace(40, 17, 11, expression)}
      <line x1="40" y1="28" x2="40" y2="60" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M40 42 L22 56" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M40 42 L58 56" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M40 60 L28 82" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M40 60 L52 82" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function WomanSvg({ color, hairColor = '#a0522d', dressColor = '#6b7db3', expression = 'none' }: SvgProps) {
  return (
    <svg viewBox="-4 -4 88 108" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <path d="M33 10 Q6 18 4 70" stroke={hairColor} strokeWidth="7" strokeLinecap="round" />
      <path d="M35 9 Q16 24 15 72" stroke={hairColor} strokeWidth="6" strokeLinecap="round" />
      <path d="M45 9 Q64 24 65 72" stroke={hairColor} strokeWidth="6" strokeLinecap="round" />
      <path d="M47 10 Q74 18 76 70" stroke={hairColor} strokeWidth="7" strokeLinecap="round" />
      <path d="M24 15 Q24 1 40 1 Q56 1 56 15" stroke={hairColor} strokeWidth="5" strokeLinecap="round" fill="none" />
      <circle cx="40" cy="17" r="13.5" stroke={color} strokeWidth="2.5" fill={color} fillOpacity="0.13" />
      <g style={{ color }}>
        {renderFace(40, 17, 13.5, expression)}
      </g>
      <path d="M32 29 L18 73 L62 73 L48 29 Z" stroke={dressColor} strokeWidth="2" fill={dressColor} strokeLinejoin="round" />
      <path d="M28 44 L52 44" stroke={dressColor} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M33 33 L14 53" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M47 33 L66 53" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M26 73 L22 91" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M54 73 L58 91" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function CatSvg({ color, expression = 'none' }: SvgProps) {
  return (
    <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color, width: '100%', height: '100%' }}>
      <ellipse cx="38" cy="65" rx="18" ry="13" stroke="currentColor" strokeWidth="2.2" fill="currentColor" fillOpacity="0.10" />
      <circle cx="40" cy="34" r="16" stroke="currentColor" strokeWidth="2.2" fill="currentColor" fillOpacity="0.10" />
      <path d="M28 22 L23 10 L36 20" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="currentColor" fillOpacity="0.15" />
      <path d="M52 22 L57 10 L44 20" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="currentColor" fillOpacity="0.15" />
      {/* Slit eyes — cat design element */}
      <ellipse cx="34" cy="32" rx="2.5" ry="3" fill="currentColor" />
      <ellipse cx="46" cy="32" rx="2.5" ry="3" fill="currentColor" />
      {/* Nose */}
      <path d="M38 39 L40 41 L42 39 Q40 43 38 39 Z" fill="currentColor" />
      {/* Whiskers */}
      <path d="M14 37 L36 40 M13 42 L36 42" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M66 37 L44 40 M67 42 L44 42" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      {renderMouth(40, 34, 16, expression)}
      <path d="M20 65 Q8 72 10 84 Q12 92 22 88" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M30 76 L28 90" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M44 76 L46 90" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function RobotSvg({ color, expression = 'none' }: SvgProps) {
  return (
    <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color, width: '100%', height: '100%' }}>
      <line x1="40" y1="6" x2="40" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="40" cy="5" r="3" fill="currentColor" />
      <rect x="26" y="15" width="28" height="22" rx="4" stroke="currentColor" strokeWidth="2.2" fill="currentColor" fillOpacity="0.10" />
      {/* Lens eyes — robot design element */}
      <rect x="30" y="20" width="7" height="6" rx="1.5" fill="currentColor" fillOpacity="0.55" />
      <rect x="43" y="20" width="7" height="6" rx="1.5" fill="currentColor" fillOpacity="0.55" />
      {renderMouth(40, 26, 11, expression)}
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

function KidSvg({ color, expression = 'none' }: SvgProps) {
  return (
    <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color, width: '100%', height: '100%' }}>
      <circle cx="40" cy="20" r="15" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.13" />
      {renderFace(40, 20, 15, expression)}
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
  cat:    CatSvg,
  robot:  RobotSvg,
  kid:    KidSvg,
}

export const CHARACTER_VARIANTS = [
  { key: 'person', label: 'Person'  },
  { key: 'woman',  label: 'Girl'    },
  { key: 'cat',    label: 'Cat'     },
  { key: 'robot',  label: 'Robot'   },
  { key: 'kid',    label: 'Kid'     },
]

// ── CharacterNode component ───────────────────────────────────────────────────

export default function CharacterNode({ id, data, selected }: NodeProps<BaseNodeData>) {
  const setSelectedNode = useFlowStore((s) => s.setSelectedNode)
  const setNodes        = useFlowStore((s) => s.setNodes)
  const showAllNotes = useFlowStore((s) => s.showAllNotes)
  const hideNotesDuringPlayback = useFlowStore((s) => s.hideNotesDuringPlayback)
  const isPlaybackRunning = useFlowStore((s) => s.isPlaybackRunning)
  const playbackPhase = useFlowStore((s) => s.playbackPhase)
  const activeCharacterHookNodeIds = useFlowStore((s) => s.activeCharacterHookNodeIds)

  const config      = data.config as Record<string, unknown>
  const variant     = typeof config.variant     === 'string' ? config.variant     : 'person'
  const hairColor   = typeof config.hairColor   === 'string' ? config.hairColor   : '#a0522d'
  const dressColor  = typeof config.dressColor  === 'string' ? config.dressColor  : '#6b7db3'
  const expression  = typeof config.expression  === 'string' ? config.expression  : 'none'
  const expressionBefore = typeof config.expressionBefore === 'string' ? config.expressionBefore : 'inherit'
  const expressionAfter = typeof config.expressionAfter === 'string' ? config.expressionAfter : 'inherit'
  const noteBefore = typeof config.noteBefore === 'string' ? config.noteBefore.trim() : ''
  const noteAfter = typeof config.noteAfter === 'string' ? config.noteAfter.trim() : ''
  const cloudColor  = typeof config.cloudColor  === 'string' ? config.cloudColor  : '#f0f9ff'
  const speechHook  = typeof config.speechHook  === 'string' ? config.speechHook  : 'none'
  const width       = coerceSize(config.width,  DEFAULT_W, MIN_SIZE)
  const height      = coerceSize(config.height, DEFAULT_H, MIN_SIZE)
  const color       = data.accentColor ?? '#94a3b8'
  const animState   = data.animationState ?? 'idle'

  const SvgChar = CHARACTER_SVGS[variant] ?? PersonSvg
  const hideNotesNow = hideNotesDuringPlayback && isPlaybackRunning
  const beforeHookEnabled = speechHook === 'before' || speechHook === 'beforeAfter' || noteBefore.length > 0 || expressionBefore !== 'inherit'
  const afterHookEnabled = speechHook === 'after' || speechHook === 'beforeAfter' || noteAfter.length > 0 || expressionAfter !== 'inherit'
  const isActiveHookSpeaker = activeCharacterHookNodeIds.includes(id)
  const showHookNote =
    isActiveHookSpeaker &&
    ((playbackPhase === 'before' && beforeHookEnabled) ||
      (playbackPhase === 'after' && afterHookEnabled))
  const hideHookSpeech = hideNotesNow && !showHookNote
  const defaultNote = typeof data.note === 'string' ? data.note : ''
  const effectiveNote =
    playbackPhase === 'before' && beforeHookEnabled
      ? (noteBefore || defaultNote)
      : playbackPhase === 'after' && afterHookEnabled
        ? (noteAfter || defaultNote)
        : defaultNote
  const effectiveExpression =
    playbackPhase === 'before' && beforeHookEnabled
      ? (expressionBefore === 'inherit' ? expression : expressionBefore)
      : playbackPhase === 'after' && afterHookEnabled
        ? (expressionAfter === 'inherit' ? expression : expressionAfter)
        : expression
  const showNote = !!effectiveNote && !hideHookSpeech && (showAllNotes || data.noteAlwaysVisible || animState === 'processing' || showHookNote)
  const notePos = { bottom: 'calc(100% - 10px)', left: '64%', width: 230 }
  const bubbleAnim = { initial: { opacity: 0, y: 6, x: -4 }, animate: { opacity: 1, y: 0, x: 0 }, exit: { opacity: 0, y: 6, x: -4 } }
  const cloudBorder = mixWithWhite(cloudColor, 0.18)
  const cloudFill = mixWithWhite(cloudColor, 0.1)
  const cloudPuff = mixWithWhite(cloudColor, 0.22)

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
      <SvgChar color={color} hairColor={hairColor} dressColor={dressColor} expression={effectiveExpression} />

      <AnimatePresence>
        {showNote && (
          <motion.div
            initial={bubbleAnim.initial}
            animate={bubbleAnim.animate}
            exit={bubbleAnim.exit}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute pointer-events-none"
            style={notePos}
          >
            <div
              className="relative rounded-[30px] border shadow-xl backdrop-blur-[1px] overflow-visible"
              style={{
                borderColor: hexToRgba(cloudBorder, 0.95),
                backgroundColor: hexToRgba(cloudFill, 0.9),
                boxShadow: '0 10px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.5)',
              }}
            >
              {/* Cloud-like tail made from small puffs */}
              <div
                className="absolute -bottom-2 left-7 h-3.5 w-3.5 rounded-full border"
                style={{ borderColor: hexToRgba(cloudBorder, 0.9), backgroundColor: hexToRgba(cloudPuff, 0.88) }}
              />
              <div
                className="absolute -bottom-5 left-4 h-2.5 w-2.5 rounded-full border"
                style={{ borderColor: hexToRgba(cloudBorder, 0.86), backgroundColor: hexToRgba(cloudPuff, 0.82) }}
              />
              <div className="px-3.5 py-2.5 text-[16px] leading-relaxed font-medium text-slate-950 prose prose-sm max-w-none text-center [&_strong]:text-slate-950 [&_ul]:my-1 [&_ul]:pl-4 [&_ul]:text-left [&_li]:my-0.5 [&_p]:my-1 [&_code]:text-sky-800 [&_code]:bg-slate-200/70 [&_code]:px-1 [&_code]:rounded">
                <ReactMarkdown>{effectiveNote}</ReactMarkdown>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
