import { useState, useCallback, useMemo } from 'react'
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  ControlButton,
  ConnectionLineType,
  type Node,
  type NodeMouseHandler,
  type EdgeTypes,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { LayoutTemplate, MousePointerClick, Lock, Unlock } from 'lucide-react'
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
  onEvalTargets?: (nodeIds: string[]) => void
  onPlayFromNode?: (nodeId: string) => void
  onSuccessNode?: (nodeId: string) => void
  onRisksNode?: (nodeId: string) => void
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
  light: { bg: '#f4f7ff', dot: '#3b82f620' },
}

export default function FlowCanvas({ activeEdges, onOpenTemplates, onExplainNode, onEvalTargets, onPlayFromNode, onSuccessNode, onRisksNode }: FlowCanvasProps) {
  const nodes         = useFlowStore((s) => s.nodes)
  const edges         = useFlowStore((s) => s.edges)
  const theme         = useFlowStore((s) => s.theme)
  const showExecutionPriorities = useFlowStore((s) => s.showExecutionPriorities)
  const canvasNodesLocked = useFlowStore((s) => s.canvasNodesLocked)
  const toggleCanvasNodesLocked = useFlowStore((s) => s.toggleCanvasNodesLocked)
  const removeNode    = useFlowStore((s) => s.removeNode)
  const duplicateNode = useFlowStore((s) => s.duplicateNode)
  const isDark = theme === 'dark'

  const colors = THEME[theme]

  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; nodeId: string; nodeType?: string } | null>(null)
  const [ctxEvalTargetIds, setCtxEvalTargetIds] = useState<string[]>([])

  const handleNodeContextMenu = useCallback<NodeMouseHandler>((e, node) => {
    e.preventDefault()
    const selectedNonFrame = nodes.filter((n) => n.selected && n.type !== 'frame').map((n) => n.id)
    const nodeConfig = (node.data as { config?: Record<string, unknown> } | undefined)?.config
    const frameWidth = typeof node.width === 'number'
      ? node.width
      : typeof node.style?.width === 'number'
        ? node.style.width
        : typeof nodeConfig?.width === 'number'
          ? nodeConfig.width
          : 420
    const frameHeight = typeof node.height === 'number'
      ? node.height
      : typeof node.style?.height === 'number'
        ? node.style.height
        : typeof nodeConfig?.height === 'number'
          ? nodeConfig.height
          : 260

    let evalTargets: string[] = [node.id]
    if (node.type === 'frame') {
      const minX = node.position.x
      const minY = node.position.y
      const maxX = minX + frameWidth
      const maxY = minY + frameHeight
      const inFrame = nodes
        .filter((n) => n.id !== node.id && n.type !== 'frame')
        .filter((n) =>
          n.position.x >= minX &&
          n.position.x <= maxX &&
          n.position.y >= minY &&
          n.position.y <= maxY,
        )
        .map((n) => n.id)
      if (inFrame.length > 0) evalTargets = inFrame
    } else if (node.selected && selectedNonFrame.length > 1) {
      evalTargets = selectedNonFrame
    }

    setCtxEvalTargetIds(evalTargets)
    setCtxMenu({ x: e.clientX, y: e.clientY, nodeId: node.id, nodeType: node.type })
  }, [nodes])

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
        onPaneClick={() => { handlePaneClick(); setCtxMenu(null); setCtxEvalTargetIds([]) }}
        onNodeContextMenu={handleNodeContextMenu}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={!canvasNodesLocked}
        nodesConnectable={!canvasNodesLocked}
        elementsSelectable={!canvasNodesLocked}
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
          className={isDark
            ? '!bg-gray-900/80 !border-white/10 !shadow-xl [&_button]:!bg-transparent [&_button]:!border-white/10 [&_button]:!text-zinc-300 [&_button:hover]:!bg-white/10 [&_button:hover]:!text-white [&_button:disabled]:!text-zinc-600 [&_button:disabled]:!opacity-70'
            : '!bg-white/85 !border-sky-200/70 !shadow-lg [&_button]:!bg-transparent [&_button]:!border-sky-200/70 [&_button]:!text-slate-600 [&_button:hover]:!bg-sky-50 [&_button:hover]:!text-sky-900 [&_button:disabled]:!text-slate-400 [&_button:disabled]:!opacity-70'
          }
        >
          <ControlButton
            onClick={() => toggleCanvasNodesLocked()}
            title={canvasNodesLocked ? 'Unlock canvas — drag nodes and frames' : 'Lock canvas — pan/zoom only'}
            aria-label={canvasNodesLocked ? 'Unlock canvas' : 'Lock canvas'}
            className={
              canvasNodesLocked
                ? (isDark ? '!bg-white/15 !text-white' : '!bg-sky-100 !text-sky-800')
                : undefined
            }
          >
            {canvasNodesLocked
              ? <Lock size={14} strokeWidth={2} aria-hidden />
              : <Unlock size={14} strokeWidth={2} aria-hidden />}
          </ControlButton>
        </Controls>
      </ReactFlow>

      <Watermark />

      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-4 text-center pointer-events-auto">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center border border-white/10"
              style={{
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(59,130,246,0.22)',
                background: isDark
                  ? 'linear-gradient(135deg, #0F766E22, #1D4ED822)'
                  : 'linear-gradient(135deg, #4f46e51c, #14b8a622)',
              }}>
              <MousePointerClick size={24} className={isDark ? 'text-white/30' : 'text-sky-600/55'} />
            </div>
            <div>
              <p className={isDark ? 'text-[14px] font-medium text-white/50' : 'text-[14px] font-medium text-slate-700/80'}>
                Drag a component from the sidebar
              </p>
              <p className={isDark ? 'text-[12px] text-white/25 mt-1' : 'text-[12px] text-slate-500/90 mt-1'}>
                or start from a template
              </p>
            </div>
            {onOpenTemplates && (
              <button
                type="button"
                onClick={onOpenTemplates}
                className="
                  flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium
                  transition-colors
                "
                style={isDark
                  ? { background: 'rgba(15,118,110,0.35)', borderColor: 'rgba(20,184,166,0.3)', color: 'rgb(165,243,252)' }
                  : { background: 'rgba(79,70,229,0.1)', borderColor: 'rgba(79,70,229,0.3)', color: 'rgb(67,56,202)' }
                }
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
            nodeType={ctxMenu.nodeType}
            evalTargetNodeIds={ctxEvalTargetIds}
            onDelete={(id) => { removeNode(id) }}
            onDuplicate={(id) => { duplicateNode(id) }}
            onExplainNode={(id) => { onExplainNode?.(id) }}
            onEvalTargets={(ids) => { onEvalTargets?.(ids) }}
            onPlayFrom={(id) => { onPlayFromNode?.(id) }}
            onSuccessNode={(id) => { onSuccessNode?.(id) }}
            onRisksNode={(id) => { onRisksNode?.(id) }}
            onClose={() => { setCtxMenu(null); setCtxEvalTargetIds([]) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
