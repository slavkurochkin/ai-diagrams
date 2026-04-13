import { useCallback, useLayoutEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import type { NodeProps } from 'reactflow'
import { useUpdateNodeInternals } from 'reactflow'
import { useFlowStore, selectTheme } from '../../../hooks/useFlowStore'
import { getNodeDefinition } from '../../../lib/nodeDefinitions'
import type { BaseNodeData } from '../../../types/nodes'
import { sortPortsByOrder } from '../../../lib/portLayout'
import NodePort from './NodePort'

// ── Animation state → ring color ─────────────────────────────────────────────

const ANIM_RING: Record<string, string> = {
  idle:       'transparent',
  active:     '#D97706aa',
  processing: '#D97706aa',
  done:       '#16A34Aaa',
  error:      '#DC2626aa',
}

// ── Props for the preview rows rendered in each node body ─────────────────────

interface PreviewRowProps {
  label: string
  value: string | number | boolean | undefined
  isDark?: boolean
}

function PreviewRow({ label, value, isDark }: PreviewRowProps) {
  const display =
    value === undefined || value === '' || value === null
      ? '—'
      : String(value)

  const truncated =
    display.length > 28 ? display.slice(0, 26) + '…' : display

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className={`text-[10px] uppercase tracking-wider shrink-0 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
        {label}
      </span>
      <span className={`text-[11px] truncate font-mono ${isDark ? 'text-white/80' : 'text-slate-700'}`}>
        {truncated}
      </span>
    </div>
  )
}

// ── BaseNode ──────────────────────────────────────────────────────────────────

interface BaseNodeProps extends NodeProps<BaseNodeData> {
  /** Preview rows to render in the card body — up to 3 recommended. */
  preview: PreviewRowProps[]
}

export default function BaseNode({ id, data, selected, preview }: BaseNodeProps) {
  const updateNodeInternals = useUpdateNodeInternals()
  const setSelectedNode   = useFlowStore((s) => s.setSelectedNode)
  const theme             = useFlowStore(selectTheme)
  const compactMode       = useFlowStore((s) => s.compactMode)
  const layoutDirection   = useFlowStore((s) => s.layoutDirection)
  const showAllNotes      = useFlowStore((s) => s.showAllNotes)
  const hideNotesDuringPlayback = useFlowStore((s) => s.hideNotesDuringPlayback)
  const isPlaybackRunning = useFlowStore((s) => s.isPlaybackRunning)
  const isDark = theme === 'dark'
  const def = getNodeDefinition(data.nodeType)

  const handleClick = useCallback(() => {
    setSelectedNode(id)
  }, [id, setSelectedNode])

  const portOffsetsKey = useMemo(() => {
    const o = data.portOffsets
    if (!o || Object.keys(o).length === 0) return ''
    return Object.keys(o)
      .sort()
      .map((k) => `${k}:${Number(o[k])}`)
      .join('|')
  }, [data.portOffsets])

  const portOrderKey = useMemo(() => {
    const po = data.portOrder
    if (!po) return ''
    const ins = po.inputs?.join(',') ?? ''
    const outs = po.outputs?.join(',') ?? ''
    return `${ins}|${outs}`
  }, [data.portOrder])

  useLayoutEffect(() => {
    updateNodeInternals(id)
  }, [id, updateNodeInternals, portOffsetsKey, portOrderKey, layoutDirection, compactMode])

  if (!def) return null

  const animState  = data.animationState ?? 'idle'
  const isActiveOrProcessing = animState === 'active' || animState === 'processing'
  const ringColor  = ANIM_RING[animState] ?? 'transparent'
  const hideNotesNow = hideNotesDuringPlayback && isPlaybackRunning
  const showNote   = !!data.note && !hideNotesNow && (showAllNotes || data.noteAlwaysVisible || animState === 'processing')
  const resolvedNotePlacement = data.notePlacement === 'right' || data.notePlacement === 'bottom'
    ? data.notePlacement
    : layoutDirection === 'LR'
      ? 'bottom'
      : 'right'
  const notePos = resolvedNotePlacement === 'bottom'
    ? { top: 'calc(100% + 12px)', left: 0, width: 220 }
    : { top: 0, left: 'calc(100% + 16px)', width: 220 }
  const compactNoteAnimation = resolvedNotePlacement === 'bottom'
    ? { initial: { opacity: 0, scale: 0.95, y: -6 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.95, y: -6 } }
    : { initial: { opacity: 0, scale: 0.95, x: 8 }, animate: { opacity: 1, scale: 1, x: 0 }, exit: { opacity: 0, scale: 0.95, x: 8 } }
  const fullNoteAnimation = resolvedNotePlacement === 'bottom'
    ? { initial: { opacity: 0, y: -8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } }
    : { initial: { opacity: 0, x: 8 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 8 } }
  const Icon = def.icon

  // Gradient stops derived from the accent color
  const accentHex = data.accentColor ?? def.accentColor
  const accentFaint = `${accentHex}22`

  const SIZE = 80

  if (compactMode) {
    return (
      <motion.div
        className="relative cursor-pointer select-none"
        style={{ width: SIZE, height: SIZE }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        onClick={handleClick}
        title={data.label}
      >
        {/* Glow / selection ring */}
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          animate={
            isActiveOrProcessing
              ? { boxShadow: [
                  `0 0 0 2px ${ringColor}, 0 0 10px 2px ${ringColor}`,
                  `0 0 0 3px ${ringColor}, 0 0 20px 4px ${ringColor}`,
                  `0 0 0 2px ${ringColor}, 0 0 10px 2px ${ringColor}`,
                ] }
              : { boxShadow: selected
                  ? `0 0 0 2.5px ${accentHex}, 0 0 16px 2px ${accentHex}50`
                  : animState !== 'idle'
                  ? `0 0 0 2px ${ringColor}`
                  : 'none',
                }
          }
          transition={
            isActiveOrProcessing
              ? { repeat: Infinity, duration: 1.2, ease: 'easeInOut' }
              : { duration: 0.2 }
          }
        />

        {/* Circle body */}
        <div
          className="w-full h-full rounded-full flex items-center justify-center relative overflow-hidden shadow-lg"
          style={{ background: `linear-gradient(135deg, ${accentHex}dd 0%, ${accentHex}88 100%)` }}
        >
          {/* Shimmer when processing */}
          {isActiveOrProcessing && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)' }}
              animate={{ x: ['-100%', '200%'] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
            />
          )}
          <div className="text-white/95 relative z-10">
            <Icon size={48} />
          </div>
        </div>

        {/* Status dot */}
        {isActiveOrProcessing && (
          <motion.div
            className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-gray-950"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
          />
        )}
        {animState === 'done' && (
          <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-gray-950" />
        )}

        {/* Label below icon */}
        <div
          className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-white/60 pointer-events-none"
          style={{ top: SIZE + 4 }}
        >
          {data.label}
        </div>

        {/* Ports */}
        {sortPortsByOrder(def.inputs, data.portOrder?.inputs).map((port, i, arr) => (
          <NodePort
            key={port.id}
            port={port}
            side="input"
            index={i}
            total={arr.length}
            portOffsets={data.portOffsets}
          />
        ))}
        {sortPortsByOrder(def.outputs, data.portOrder?.outputs).map((port, i, arr) => (
          <NodePort
            key={port.id}
            port={port}
            side="output"
            index={i}
            total={arr.length}
            portOffsets={data.portOffsets}
          />
        ))}

        {/* Note card */}
        <AnimatePresence>
          {showNote && (
            <motion.div
              initial={compactNoteAnimation.initial}
              animate={compactNoteAnimation.animate}
              exit={compactNoteAnimation.exit}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute pointer-events-none"
              style={notePos}
            >
              <div
                className={`rounded-xl shadow-2xl overflow-hidden ${isDark ? 'border border-white/10' : 'border border-indigo-200/70'}`}
                style={{ background: isDark ? `${accentHex}18` : `${accentHex}12`, backdropFilter: 'blur(8px)' }}
              >
                <div className="h-0.5" style={{ background: `linear-gradient(90deg, ${accentHex}, transparent)` }} />
                <div
                  className={`px-3 py-2.5 text-[12px] leading-relaxed prose prose-sm max-w-none [&_ul]:my-1 [&_ul]:pl-4 [&_li]:my-0.5 [&_p]:my-1 [&_code]:px-1 [&_code]:rounded ${
                    isDark
                      ? 'text-white/80 prose-invert [&_strong]:text-white [&_code]:text-sky-300 [&_code]:bg-white/10'
                      : 'text-slate-700 [&_strong]:text-slate-900 [&_code]:text-indigo-700 [&_code]:bg-indigo-100'
                  }`}
                >
                  <ReactMarkdown>{data.note}</ReactMarkdown>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    )
  }

  return (
    <motion.div
      className="relative"
      style={{ width: 220 }}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      onClick={handleClick}
    >
      {/* Selection / animation ring */}
      <motion.div
        className="absolute inset-0 rounded-xl pointer-events-none"
        animate={
          isActiveOrProcessing
            ? { boxShadow: [
                `0 0 0 1.5px ${ringColor}, 0 0 8px 1px ${ringColor}`,
                `0 0 0 2px ${ringColor}, 0 0 16px 3px ${ringColor}`,
                `0 0 0 1.5px ${ringColor}, 0 0 8px 1px ${ringColor}`,
              ] }
            : { boxShadow: selected
                ? `0 0 0 2px ${accentHex}99, 0 0 16px 2px ${accentHex}30`
                : animState !== 'idle'
                ? `0 0 0 1.5px ${ringColor}`
                : 'none',
              }
        }
        transition={
          isActiveOrProcessing
            ? { repeat: Infinity, duration: 1.2, ease: 'easeInOut' }
            : { duration: 0.2 }
        }
      />

      {/* Card shell */}
      <div
        className={`
          rounded-xl overflow-hidden
          backdrop-blur-sm shadow-2xl
          cursor-pointer select-none
          ${isDark
            ? 'bg-gray-900/80 border border-white/10'
            : 'bg-white/90 border border-black/10 shadow-lg'
          }
        `}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div
          className="flex items-center gap-2 px-3 py-2 relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${accentHex}cc 0%, ${accentHex}88 100%)`,
          }}
        >
          {/* Shimmer sweep when processing */}
          {isActiveOrProcessing && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)',
              }}
              animate={{ x: ['-100%', '200%'] }}
              transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }}
            />
          )}
          <div className="shrink-0 text-white/90">
            <Icon size={16} />
          </div>
          <span className="text-[12px] font-semibold text-white tracking-wide truncate">
            {data.label}
          </span>

          {/* Processing indicator dot */}
          {isActiveOrProcessing && (
            <motion.div
              className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
            />
          )}
          {animState === 'done' && (
            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
          )}
          {animState === 'error' && (
            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
          )}
        </div>

        {/* ── Thin accent line below header ──────────────────────────────── */}
        <div
          className="h-px"
          style={{ background: `linear-gradient(90deg, ${accentHex}60, transparent)` }}
        />

        {/* ── Body — config preview ──────────────────────────────────────── */}
        <div
          className="px-3 py-2 space-y-1"
          style={{
            background: `linear-gradient(180deg, ${accentFaint} 0%, transparent 60%)`,
          }}
        >
          {preview.map((row) => (
            <PreviewRow key={row.label} label={row.label} value={row.value} isDark={isDark} />
          ))}
        </div>
      </div>

      {/* ── Input ports (left side) ──────────────────────────────────────── */}
      {sortPortsByOrder(def.inputs, data.portOrder?.inputs).map((port, i, arr) => (
        <NodePort
          key={port.id}
          port={port}
          side="input"
          index={i}
          total={arr.length}
          portOffsets={data.portOffsets}
        />
      ))}

      {/* ── Output ports (right side) ────────────────────────────────────── */}
      {sortPortsByOrder(def.outputs, data.portOrder?.outputs).map((port, i, arr) => (
        <NodePort
          key={port.id}
          port={port}
          side="output"
          index={i}
          total={arr.length}
          portOffsets={data.portOffsets}
        />
      ))}

      {/* ── Note card — shown beside node during animation ───────────────── */}
      <AnimatePresence>
        {showNote && (
          <motion.div
            initial={fullNoteAnimation.initial}
            animate={fullNoteAnimation.animate}
            exit={fullNoteAnimation.exit}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute pointer-events-none"
            style={notePos}
          >
            <div
              className={`rounded-xl shadow-2xl overflow-hidden ${isDark ? 'border border-white/10' : 'border border-indigo-200/70'}`}
              style={{ background: isDark ? `${accentHex}18` : `${accentHex}12`, backdropFilter: 'blur(8px)' }}
            >
              {/* Accent top bar */}
              <div className="h-0.5" style={{ background: `linear-gradient(90deg, ${accentHex}, transparent)` }} />
              <div
                className={`px-3 py-2.5 text-[12px] leading-relaxed prose prose-sm max-w-none
                  [&_strong]:font-semibold
                  [&_ul]:my-1 [&_ul]:pl-4 [&_li]:my-0.5
                  [&_ol]:my-1 [&_ol]:pl-4
                  [&_h1]:text-[13px] [&_h1]:font-semibold [&_h1]:mb-1
                  [&_h2]:text-[12px] [&_h2]:font-semibold [&_h2]:mb-1
                  [&_p]:my-1 [&_code]:px-1 [&_code]:rounded
                  ${isDark
                    ? 'text-white/80 prose-invert [&_strong]:text-white [&_em]:text-white/70 [&_h1]:text-white [&_h2]:text-white [&_code]:text-sky-300 [&_code]:bg-white/10'
                    : 'text-slate-700 [&_strong]:text-slate-900 [&_em]:text-slate-600 [&_h1]:text-slate-900 [&_h2]:text-slate-900 [&_code]:text-indigo-700 [&_code]:bg-indigo-100'}
                `}
              >
                <ReactMarkdown>{data.note}</ReactMarkdown>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
