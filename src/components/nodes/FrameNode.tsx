import { useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { NodeResizer, type NodeProps } from 'reactflow'
import { useFlowStore, selectTheme } from '../../hooks/useFlowStore'
import { getNodeDefinition, DEFAULT_FRAME_OPACITY } from '../../lib/nodeDefinitions'
import type { BaseNodeData, FrameNodeConfig } from '../../types/nodes'

const MIN_FRAME_WIDTH = 180
const MIN_FRAME_HEIGHT = 120
const FULL_NODE_WIDTH = 220
const FULL_NODE_HEIGHT = 110
const COMPACT_NODE_SIZE = 80

function coerceSize(value: string | number | boolean | undefined, fallback: number, min: number) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(min, value)
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return Math.max(min, parsed)
  }
  return fallback
}

function coerceOpacity(value: string | number | boolean | undefined) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.min(1, Math.max(0, value))
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return Math.min(1, Math.max(0, parsed))
  }
  return DEFAULT_FRAME_OPACITY
}

/** 6-digit hex (with or without #) → RGB; invalid → default blue. */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace('#', '').trim()
  if (h.length === 3) {
    h = h.split('').map((c) => c + c).join('')
  }
  if (h.length !== 6 || !/^[0-9a-fA-F]+$/.test(h)) {
    return { r: 38, g: 100, b: 232 }
  }
  const n = parseInt(h, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

/** `a` is 0–1; clamps. Used so100% opacity = strong (near-solid) fill, not just CSS opacity on a faint tint. */
function accentAlpha(hex: string, a: number): string {
  const { r, g, b } = hexToRgb(hex)
  const alpha = Math.min(1, Math.max(0, a))
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default function FrameNode({ id, data, selected }: NodeProps<BaseNodeData>) {
  const setSelectedNode = useFlowStore((s) => s.setSelectedNode)
  const setNodes = useFlowStore((s) => s.setNodes)
  const nodes = useFlowStore((s) => s.nodes)
  const compactMode = useFlowStore((s) => s.compactMode)
  const theme = useFlowStore(selectTheme)
  const def = getNodeDefinition(data.nodeType)
  const config = data.config as unknown as Partial<FrameNodeConfig>
  const accentHex = data.accentColor ?? def?.accentColor ?? '#2664e8'
  const width = coerceSize(config.width, 420, MIN_FRAME_WIDTH)
  const height = coerceSize(config.height, 260, MIN_FRAME_HEIGHT)
  const title = typeof config.title === 'string' && config.title.trim() ? config.title.trim() : 'Section'
  const titleTextOverride = data.headerTextColor?.trim()
  const opacity = coerceOpacity(config.opacity)
  const glowEnabled = config.groupGlow === true
  const isDark = theme === 'dark'
  const activity = useMemo(() => {
    const frame = nodes.find((n) => n.id === id)
    if (!frame) return { active: 0 }

    const frameLeft = frame.position.x
    const frameTop = frame.position.y
    const frameRight = frameLeft + width
    const frameBottom = frameTop + height
    let active = 0

    for (const node of nodes) {
      if (node.id === id || node.type === 'frame') continue

      const nodeWidth = typeof node.width === 'number'
        ? node.width
        : typeof node.style?.width === 'number'
          ? node.style.width
          : typeof node.data.config?.width === 'number'
            ? node.data.config.width
            : compactMode
              ? COMPACT_NODE_SIZE
              : FULL_NODE_WIDTH
      const nodeHeight = typeof node.height === 'number'
        ? node.height
        : typeof node.style?.height === 'number'
          ? node.style.height
          : typeof node.data.config?.height === 'number'
            ? node.data.config.height
            : compactMode
              ? COMPACT_NODE_SIZE
              : FULL_NODE_HEIGHT

      const centerX = node.position.x + nodeWidth / 2
      const centerY = node.position.y + nodeHeight / 2
      const insideFrame = centerX >= frameLeft && centerX <= frameRight && centerY >= frameTop && centerY <= frameBottom
      if (!insideFrame) continue

      if (node.data.animationState === 'active' || node.data.animationState === 'processing') {
        active += 1
      }
    }

    return { active }
  }, [compactMode, height, id, nodes, width])
  const hasGroupActivity = glowEnabled && activity.active > 0

  const o = opacity
  const bodyBg = isDark
    ? `linear-gradient(180deg, ${accentAlpha(accentHex, 0.44 * o)} 0%, ${accentAlpha(accentHex, 0.30 * o)} 100%)`
    : `linear-gradient(180deg, ${accentAlpha(accentHex, 0.34 * o)} 0%, ${accentAlpha(accentHex, 0.24 * o)} 100%)`
  const borderCol = accentAlpha(accentHex, (isDark ? 0.88 : 0.78) * o)
  const titleBarBg = isDark
    ? `linear-gradient(180deg, ${accentAlpha(accentHex, 0.50 * o)} 0%, transparent 100%)`
    : `linear-gradient(180deg, ${accentAlpha(accentHex, 0.40 * o)} 0%, transparent 100%)`
  const dotGlow = accentAlpha(accentHex, 0.14 * o)
  const shadowIdle = `0 0 0 1px ${accentAlpha(accentHex, 0.14 * o)} inset`
  const shadowSelected = `0 0 0 1px ${accentAlpha(accentHex, 0.42 * o)} inset, 0 10px 24px -18px ${accentAlpha(accentHex, 0.36 * o)}`
  const shadowActivity = [
    `0 0 0 1px ${accentAlpha(accentHex, 0.34 * o)} inset, 0 0 0 1px ${accentAlpha(accentHex, 0.14 * o)}, 0 0 16px 2px ${accentAlpha(accentHex, 0.20 * o)}`,
    `0 0 0 1px ${accentAlpha(accentHex, 0.48 * o)} inset, 0 0 0 1px ${accentAlpha(accentHex, 0.22 * o)}, 0 0 30px 6px ${accentAlpha(accentHex, 0.30 * o)}`,
    `0 0 0 1px ${accentAlpha(accentHex, 0.34 * o)} inset, 0 0 0 1px ${accentAlpha(accentHex, 0.14 * o)}, 0 0 16px 2px ${accentAlpha(accentHex, 0.20 * o)}`,
  ]

  const handleResizeEnd = useCallback(
    (_event: unknown, params: { width: number; height: number }) => {
      const nextWidth = Math.round(Math.max(MIN_FRAME_WIDTH, params.width))
      const nextHeight = Math.round(Math.max(MIN_FRAME_HEIGHT, params.height))
      const nodes = useFlowStore.getState().nodes

      setNodes(nodes.map((node) => {
        if (node.id !== id) return node
        return {
          ...node,
          zIndex: typeof node.zIndex === 'number' ? node.zIndex : -1,
          style: { ...node.style, width: nextWidth, height: nextHeight },
          data: {
            ...node.data,
            config: {
              ...node.data.config,
              width: nextWidth,
              height: nextHeight,
            },
          },
        }
      }))
    },
    [id, setNodes],
  )

  return (
    <div
      className="relative"
      style={{ width, height }}
      onMouseDown={() => setSelectedNode(id)}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={MIN_FRAME_WIDTH}
        minHeight={MIN_FRAME_HEIGHT}
        lineClassName="!border-slate-400/40"
        handleClassName="!w-3 !h-3 !rounded-sm !border !border-white/50 !bg-slate-700/90"
        onResizeEnd={handleResizeEnd}
      />

      <motion.div
        className={`w-full h-full rounded-2xl border ${isDark && o > 0.08 ? 'backdrop-blur-[1px]' : ''}`}
        style={{
          background: bodyBg,
          borderColor: borderCol,
        }}
        animate={
          hasGroupActivity
            ? { boxShadow: shadowActivity }
            : { boxShadow: selected ? shadowSelected : shadowIdle }
        }
        transition={hasGroupActivity ? { repeat: Infinity, duration: 1.3, ease: 'easeInOut' } : { duration: 0.2 }}
      >
        <div
          className="absolute inset-x-0 top-0 h-10 rounded-t-2xl"
          style={{ background: titleBarBg }}
        />

        <div className="absolute top-3 left-4 right-4 flex items-center gap-2 min-w-0">
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: accentHex, boxShadow: `0 0 0 5px ${dotGlow}` }}
          />
          <span
            className={`truncate text-[12px] font-semibold tracking-wide ${
              titleTextOverride ? '' : isDark ? 'text-white/70' : 'text-slate-700/80'
            }`}
            style={titleTextOverride ? { color: titleTextOverride } : undefined}
          >
            {title}
          </span>
          {hasGroupActivity && (
            <motion.div
              className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-300 shrink-0"
              animate={{ opacity: [1, 0.25, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
            />
          )}
        </div>
      </motion.div>
    </div>
  )
}
