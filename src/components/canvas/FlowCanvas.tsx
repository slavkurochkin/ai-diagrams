import { useState, useCallback, useMemo } from 'react'
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  ConnectionLineType,
  type Node,
  type NodeMouseHandler,
  type EdgeTypes,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { LayoutTemplate, MousePointerClick } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'

import { useFlowStore } from '../../hooks/useFlowStore'
import { nodeTypes } from '../nodes'
import { useFlowHandlers } from './useFlowHandlers'
import Watermark from './Watermark'
import NodeContextMenu from './NodeContextMenu'
import CustomEdge from './CustomEdge'
import type { BaseNodeData } from '../../types/nodes'

const edgeTypes: EdgeTypes = { smoothstep: CustomEdge }

interface ActiveEdge {
  edgeId: string
  color: string
  duration: number
}

interface FlowCanvasProps {
  activeEdges: ActiveEdge[]
  onOpenTemplates?: () => void
  onExplainNode?: (nodeId: string) => void
}

const FLOW_PROPS = {
  minZoom: 0.2,
  maxZoom: 2,
  defaultViewport: { x: 0, y: 0, zoom: 1 },
  snapToGrid: false,
  fitView: false,
  deleteKeyCode: 'Backspace',
  selectionKeyCode: 'Shift',
  multiSelectionKeyCode: 'Meta',
  zoomOnDoubleClick: false,
  defaultEdgeOptions: { type: 'smoothstep', animated: false },
  connectionLineType: ConnectionLineType.SmoothStep,
} as const

const THEME = {
  dark:  { bg: '#0F1117', dot: '#ffffff18' },
  light: { bg: '#F8FAFC', dot: '#00000012' },
}

export default function FlowCanvas({ activeEdges, onOpenTemplates, onExplainNode }: FlowCanvasProps) {
  const nodes         = useFlowStore((s) => s.nodes)
  const edges         = useFlowStore((s) => s.edges)
  const theme         = useFlowStore((s) => s.theme)
  const showExecutionPriorities = useFlowStore((s) => s.showExecutionPriorities)
  const removeNode    = useFlowStore((s) => s.removeNode)
  const duplicateNode = useFlowStore((s) => s.duplicateNode)

  const colors = THEME[theme]

  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null)

  const handleNodeContextMenu = useCallback<NodeMouseHandler>((e, node) => {
    e.preventDefault()
    setCtxMenu({ x: e.clientX, y: e.clientY, nodeId: node.id })
  }, [])

  const {
    handleNodesChange,
    handleEdgesChange,
    handleConnect,
    handleNodeClick,
    handleEdgeClick,
    handlePaneClick,
    handleDragOver,
    handleDrop,
  } = useFlowHandlers()

  const edgesWithSignal = useMemo(() => {
    const activeByEdgeId = new Map(activeEdges.map((edge) => [edge.edgeId, edge] as const))

    return edges.map((edge) => {
      const active = activeByEdgeId.get(edge.id)
      return {
        ...edge,
        data: {
          ...(edge.data ?? {}),
          activeSignalColor: active?.color ?? null,
          activeSignalDuration: active?.duration ?? null,
          showExecutionPriority: showExecutionPriorities,
        },
      }
    })
  }, [edges, activeEdges, showExecutionPriorities])

  return (
    <div
      className="flex-1 h-full relative"
      style={{ background: colors.bg }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <ReactFlow
        nodes={nodes as Node<BaseNodeData>[]}
        edges={edgesWithSignal}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={() => { handlePaneClick(); setCtxMenu(null) }}
        onNodeContextMenu={handleNodeContextMenu}
        proOptions={{ hideAttribution: false }}
        {...FLOW_PROPS}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color={colors.dot}
          style={{ background: colors.bg }}
        />
        <Controls
          showInteractive={false}
          className="!bg-gray-900/80 !border-white/10 !shadow-xl [&_button]:!bg-transparent [&_button]:!border-white/10 [&_button]:!text-gray-400 [&_button:hover]:!bg-white/10 [&_button:hover]:!text-white"
        />
      </ReactFlow>

      <Watermark />

      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-4 text-center pointer-events-auto">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center border border-white/10"
              style={{ background: 'linear-gradient(135deg, #0F766E22, #1D4ED822)' }}>
              <MousePointerClick size={24} className="text-white/30" />
            </div>
            <div>
              <p className="text-[14px] font-medium text-white/50">Drag a component from the sidebar</p>
              <p className="text-[12px] text-white/25 mt-1">or start from a template</p>
            </div>
            {onOpenTemplates && (
              <button
                type="button"
                onClick={onOpenTemplates}
                className="
                  flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium
                  bg-teal-700/35 border border-teal-500/30 text-cyan-200
                  hover:bg-teal-700/55 hover:text-white transition-colors
                "
              >
                <LayoutTemplate size={13} />
                Browse templates
              </button>
            )}
          </div>
        </div>
      )}

      {/* Node context menu */}
      <AnimatePresence>
        {ctxMenu && (
          <NodeContextMenu
            key="ctx"
            x={ctxMenu.x}
            y={ctxMenu.y}
            nodeId={ctxMenu.nodeId}
            onDelete={(id) => { removeNode(id) }}
            onDuplicate={(id) => { duplicateNode(id) }}
            onExplainNode={(id) => { onExplainNode?.(id) }}
            onClose={() => setCtxMenu(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
