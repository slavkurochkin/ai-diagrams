import { useCallback } from 'react'
import { NodeResizer, type NodeProps } from 'reactflow'
import { useFlowStore, selectTheme } from '../../hooks/useFlowStore'
import { getNodeDefinition } from '../../lib/nodeDefinitions'
import type { BaseNodeData, FrameNodeConfig } from '../../types/nodes'

const MIN_FRAME_WIDTH = 180
const MIN_FRAME_HEIGHT = 120

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
  const theme = useFlowStore(selectTheme)
  const def = getNodeDefinition(data.nodeType)
  const config = data.config as unknown as Partial<FrameNodeConfig>
  const accentHex = data.accentColor ?? def?.accentColor ?? '#64748B'
  const width = coerceSize(config.width, 420, MIN_FRAME_WIDTH)
  const height = coerceSize(config.height, 260, MIN_FRAME_HEIGHT)
  const title = typeof config.title === 'string' && config.title.trim() ? config.title.trim() : 'Section'
  const isDark = theme === 'dark'

  const handleResizeEnd = useCallback(
    (_event: unknown, params: { width: number; height: number }) => {
      const nextWidth = Math.round(Math.max(MIN_FRAME_WIDTH, params.width))
      const nextHeight = Math.round(Math.max(MIN_FRAME_HEIGHT, params.height))
      const nodes = useFlowStore.getState().nodes

      setNodes(nodes.map((node) => {
        if (node.id !== id) return node
        return {
          ...node,
          zIndex: -1,
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

      <div
        className={`w-full h-full rounded-2xl border ${isDark ? 'backdrop-blur-[1px]' : ''}`}
        style={{
          background: isDark
            ? `linear-gradient(180deg, ${accentHex}14 0%, ${accentHex}0d 100%)`
            : `linear-gradient(180deg, ${accentHex}10 0%, ${accentHex}08 100%)`,
          borderColor: isDark ? `${accentHex}44` : `${accentHex}30`,
          boxShadow: selected
            ? `0 0 0 1px ${accentHex}66 inset, 0 10px 24px -18px ${accentHex}55`
            : `0 0 0 1px ${accentHex}22 inset`,
        }}
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
        </div>
      </div>
    </div>
  )
}
