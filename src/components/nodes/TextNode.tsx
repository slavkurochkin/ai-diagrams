import { useCallback } from 'react'
import { NodeResizer, type NodeProps } from 'reactflow'
import ReactMarkdown from 'react-markdown'
import { useFlowStore, selectTheme } from '../../hooks/useFlowStore'
import { getNodeDefinition } from '../../lib/nodeDefinitions'
import type { BaseNodeData, TextNodeConfig } from '../../types/nodes'

const MIN_TEXT_WIDTH = 160
const MIN_TEXT_HEIGHT = 100

function coerceSize(value: string | number | boolean | undefined, fallback: number, min: number) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(min, value)
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return Math.max(min, parsed)
  }
  return fallback
}

export default function TextNode({ id, data, selected }: NodeProps<BaseNodeData>) {
  const setSelectedNode = useFlowStore((s) => s.setSelectedNode)
  const setNodes = useFlowStore((s) => s.setNodes)
  const theme = useFlowStore(selectTheme)
  const def = getNodeDefinition(data.nodeType)
  const config = data.config as unknown as Partial<TextNodeConfig>
  const accentHex = data.accentColor ?? def?.accentColor ?? '#94A3B8'
  const width = coerceSize(config.width, 320, MIN_TEXT_WIDTH)
  const height = coerceSize(config.height, 160, MIN_TEXT_HEIGHT)
  const fontSize = coerceSize(config.fontSize, 20, 10)
  const content = typeof config.content === 'string' && config.content.trim()
    ? config.content
    : 'Add explanation here.'
  const isDark = theme === 'dark'

  const handleResizeEnd = useCallback(
    (_event: unknown, params: { width: number; height: number }) => {
      const nextWidth = Math.round(Math.max(MIN_TEXT_WIDTH, params.width))
      const nextHeight = Math.round(Math.max(MIN_TEXT_HEIGHT, params.height))
      const nodes = useFlowStore.getState().nodes

      setNodes(nodes.map((node) => {
        if (node.id !== id) return node
        return {
          ...node,
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
        minWidth={MIN_TEXT_WIDTH}
        minHeight={MIN_TEXT_HEIGHT}
        lineClassName="!border-slate-400/40"
        handleClassName="!w-3 !h-3 !rounded-sm !border !border-white/50 !bg-slate-700/90"
        onResizeEnd={handleResizeEnd}
      />

      <div
        className="w-full h-full overflow-auto rounded-lg"
        style={{
          boxShadow: selected ? `0 0 0 1px ${accentHex}55 inset` : 'none',
        }}
      >
        <div
          className={`min-h-full px-1 py-1.5 prose max-w-none ${
            isDark ? 'prose-invert' : ''
          }
            [&_strong]:font-semibold
            [&_em]:opacity-90
            [&_ul]:my-[0.35em] [&_ul]:pl-[1.1em] [&_ul]:list-disc [&_ul]:list-outside
            [&_ol]:my-[0.35em] [&_ol]:pl-[1.1em] [&_ol]:list-decimal [&_ol]:list-outside
            [&_li]:my-[0.15em]
            [&_h1]:text-[1.55em] [&_h1]:leading-[1.05] [&_h1]:font-bold [&_h1]:tracking-[-0.03em] [&_h1]:mb-[0.4em] [&_h1]:mt-[0.1em]
            [&_h2]:text-[1.18em] [&_h2]:leading-[1.15] [&_h2]:font-semibold [&_h2]:tracking-[-0.02em] [&_h2]:mb-[0.35em] [&_h2]:mt-[0.45em]
            [&_h3]:text-[1em] [&_h3]:leading-[1.2] [&_h3]:font-semibold [&_h3]:mb-[0.25em] [&_h3]:mt-[0.4em]
            [&_p]:my-[0.35em]
            [&_code]:px-[0.22em] [&_code]:py-[0.08em] [&_code]:rounded
          `}
          style={{
            color: accentHex,
            fontSize,
            lineHeight: 1.35,
            ['--tw-prose-body' as string]: accentHex,
            ['--tw-prose-headings' as string]: accentHex,
            ['--tw-prose-bold' as string]: accentHex,
            ['--tw-prose-links' as string]: accentHex,
            ['--tw-prose-bullets' as string]: accentHex,
            ['--tw-prose-counters' as string]: accentHex,
            ['--tw-prose-code' as string]: accentHex,
            ['--tw-prose-pre-code' as string]: accentHex,
            ['--tw-prose-quotes' as string]: accentHex,
            ['--tw-prose-hr' as string]: `${accentHex}55`,
            ['--tw-prose-td-borders' as string]: `${accentHex}33`,
            ['--tw-prose-th-borders' as string]: `${accentHex}44`,
          }}
        >
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
