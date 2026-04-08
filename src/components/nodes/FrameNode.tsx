import { useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { NodeResizer, type NodeProps } from 'reactflow'
import { useFlowStore, selectTheme } from '../../hooks/useFlowStore'
import { getNodeDefinition } from '../../lib/nodeDefinitions'
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

export default function FrameNode({ id, data, selected }: NodeProps<BaseNodeData>) {
  const setSelectedNode = useFlowStore((s) => s.setSelectedNode)
  const setNodes = useFlowStore((s) => s.setNodes)
  const nodes = useFlowStore((s) => s.nodes)
  const compactMode = useFlowStore((s) => s.compactMode)
  const theme = useFlowStore(selectTheme)
  const def = getNodeDefinition(data.nodeType)
  const config = data.config as unknown as Partial<FrameNodeConfig>
  const accentHex = data.accentColor ?? def?.accentColor ?? '#64748B'
  const width = coerceSize(config.width, 420, MIN_FRAME_WIDTH)
  const height = coerceSize(config.height, 260, MIN_FRAME_HEIGHT)
  const title = typeof config.title === 'string' && config.title.trim() ? config.title.trim() : 'Section'
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
        className={`w-full h-full rounded-2xl border ${isDark ? 'backdrop-blur-[1px]' : ''}`}
        style={{
          background: isDark
            ? `linear-gradient(180deg, ${accentHex}14 0%, ${accentHex}0d 100%)`
            : `linear-gradient(180deg, ${accentHex}10 0%, ${accentHex}08 100%)`,
          borderColor: isDark ? `${accentHex}44` : `${accentHex}30`,
        }}
        animate={
          hasGroupActivity
            ? {
                boxShadow: [
                  `0 0 0 1px ${accentHex}55 inset, 0 0 0 1px ${accentHex}22, 0 0 16px 2px ${accentHex}30`,
                  `0 0 0 1px ${accentHex}77 inset, 0 0 0 1px ${accentHex}33, 0 0 30px 6px ${accentHex}4a`,
                  `0 0 0 1px ${accentHex}55 inset, 0 0 0 1px ${accentHex}22, 0 0 16px 2px ${accentHex}30`,
                ],
              }
            : {
                boxShadow: selected
                  ? `0 0 0 1px ${accentHex}66 inset, 0 10px 24px -18px ${accentHex}55`
                  : `0 0 0 1px ${accentHex}22 inset`,
              }
        }
        transition={hasGroupActivity ? { repeat: Infinity, duration: 1.3, ease: 'easeInOut' } : { duration: 0.2 }}
      >
        <div
          className="absolute inset-x-0 top-0 h-10 rounded-t-2xl"
          style={{
            background: isDark
              ? `linear-gradient(180deg, ${accentHex}18 0%, transparent 100%)`
              : `linear-gradient(180deg, ${accentHex}12 0%, transparent 100%)`,
          }}
        />

        <div className="absolute top-3 left-4 right-4 flex items-center gap-2 min-w-0">
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: accentHex, boxShadow: `0 0 0 5px ${accentHex}14` }}
          />
          <span className={`truncate text-[12px] font-semibold tracking-wide ${
            isDark ? 'text-white/70' : 'text-slate-700/80'
          }`}>
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
