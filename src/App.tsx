import { useEffect, useCallback, useRef, useState } from 'react'
import { ReactFlowProvider, useReactFlow } from 'reactflow'
import { motion, AnimatePresence } from 'framer-motion'
import { Minimize2 } from 'lucide-react'
import FlowCanvas from './components/canvas/FlowCanvas'
import Sidebar from './components/panels/Sidebar'
import Toolbar from './components/toolbar/Toolbar'
import ConfigPanel from './components/panels/ConfigPanel'
import ExplainPanel from './components/panels/ExplainPanel'
import TemplatesPanel from './components/panels/TemplatesPanel'
import FlowContextModal from './components/panels/FlowContextModal'
import AnimationControls from './components/animation/AnimationControls'
import { useFlowStore } from './hooks/useFlowStore'
import { useFlowAnimation } from './hooks/useFlowAnimation'
import { streamExplain } from './lib/api/explain'
import { streamEvalSuggestions } from './lib/api/evalSuggestions'
import { streamDesignReview } from './lib/api/designReview'
import { saveFlow, loadFlow } from './lib/flowSerializer'
import { applyAutoLayout } from './lib/autoLayout'
import { exportPlaybackAsGIF } from './lib/exportUtils'
import type { Node } from 'reactflow'
import type { BaseNodeData } from './types/nodes'
import type { FlowContext } from './types/flow'

const CONTEXT_PROMPT_KEY = 'agentflow:contextPromptSeen'

// Inner component — needs to be inside ReactFlowProvider to use useFlowAnimation
function AppInner() {
  const { getViewport, setViewport, fitView } = useReactFlow()
  const theme              = useFlowStore((s) => s.theme)
  const presentationMode   = useFlowStore((s) => s.presentationMode)
  const togglePresentation = useFlowStore((s) => s.togglePresentationMode)
  const nodes              = useFlowStore((s) => s.nodes)
  const edges              = useFlowStore((s) => s.edges)
  const flowName           = useFlowStore((s) => s.flowName)
  const gifCapturePaddingPercent = useFlowStore((s) => s.gifCapturePaddingPercent)
  const selectedNodeId     = useFlowStore((s) => s.selectedNodeId)
  const removeNode         = useFlowStore((s) => s.removeNode)
  const undo               = useFlowStore((s) => s.undo)
  const setNodes           = useFlowStore((s) => s.setNodes)
  const setEdges           = useFlowStore((s) => s.setEdges)
  const setFlowName        = useFlowStore((s) => s.setFlowName)
  const layoutDirection    = useFlowStore((s) => s.layoutDirection)
  const setLayoutDirection = useFlowStore((s) => s.setLayoutDirection)
  const flowContext        = useFlowStore((s) => s.flowContext)
  const setFlowContext     = useFlowStore((s) => s.setFlowContext)

  const animation = useFlowAnimation()
  const animationStatusRef = useRef(animation.status)

  // ── Panel state ─────────────────────────────────────────────────────────────

  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [templatesInitialTab, setTemplatesInitialTab] = useState<'templates' | 'import'>('templates')

  const openTemplatesPanel = useCallback((tab: 'templates' | 'import' = 'templates') => {
    setTemplatesInitialTab(tab)
    setTemplatesOpen(true)
  }, [])
  const [exportingGIF, setExportingGIF] = useState(false)

  // Flow context modal
  const [contextModalOpen, setContextModalOpen] = useState(false)
  const [contextModalMode, setContextModalMode] = useState<'new' | 'edit'>('new')

  type PanelStatus = 'idle' | 'loading' | 'streaming' | 'done' | 'error'

  // AI panel (explain + review + eval tabs)
  const [aiPanelOpen, setAiPanelOpen]         = useState(false)
  const [aiPanelTab, setAiPanelTab]           = useState<'explain' | 'review' | 'eval'>('explain')

  const [explainText, setExplainText]         = useState('')
  const [explainStatus, setExplainStatus]     = useState<PanelStatus>('idle')

  const [reviewText, setReviewText]           = useState('')
  const [reviewStatus, setReviewStatus]       = useState<PanelStatus>('idle')

  const [evalText, setEvalText]               = useState('')
  const [evalStatus, setEvalStatus]           = useState<PanelStatus>('idle')

  useEffect(() => {
    animationStatusRef.current = animation.status
  }, [animation.status])

  const handleExplain = useCallback(async (nodeId?: string) => {
    setAiPanelOpen(true)
    setAiPanelTab('explain')
    setExplainText('')
    setExplainStatus('loading')

    // When called for a single node, pass only that node (no edges needed)
    const targetNodes = nodeId
      ? (nodes as Parameters<typeof streamExplain>[0]).filter((n) => n.id === nodeId)
      : nodes as Parameters<typeof streamExplain>[0]
    const targetEdges = nodeId ? [] : edges
    const targetName = nodeId
      ? (nodes.find((n) => n.id === nodeId)?.data.label ?? flowName)
      : flowName

    try {
      await streamExplain(
        targetNodes,
        targetEdges,
        targetName,
        (chunk) => {
          setExplainText((t) => t + chunk)
          setExplainStatus('streaming')
        },
        () => setExplainStatus('done'),
        (msg) => {
          setExplainText(msg)
          setExplainStatus('error')
        },
      )
    } catch (err) {
      setExplainText(err instanceof Error ? err.message : 'Unexpected error')
      setExplainStatus('error')
    }
  }, [nodes, edges, flowName])

  const handleReview = useCallback(async () => {
    setAiPanelOpen(true)
    setAiPanelTab('review')
    setReviewText('')
    setReviewStatus('loading')
    try {
      await streamDesignReview(
        nodes as Parameters<typeof streamDesignReview>[0],
        edges,
        flowName,
        flowContext,
        (chunk) => {
          setReviewText((t) => t + chunk)
          setReviewStatus('streaming')
        },
        () => setReviewStatus('done'),
        (msg) => {
          setReviewText(msg)
          setReviewStatus('error')
        },
      )
    } catch (err) {
      setReviewText(err instanceof Error ? err.message : 'Unexpected error')
      setReviewStatus('error')
    }
  }, [nodes, edges, flowName, flowContext])

  const handleEval = useCallback(async () => {
    setAiPanelOpen(true)
    setAiPanelTab('eval')
    setEvalText('')
    setEvalStatus('loading')
    try {
      await streamEvalSuggestions(
        nodes as Parameters<typeof streamEvalSuggestions>[0],
        edges,
        flowName,
        flowContext,
        (chunk) => {
          setEvalText((t) => t + chunk)
          setEvalStatus('streaming')
        },
        () => setEvalStatus('done'),
        (msg) => {
          setEvalText(msg)
          setEvalStatus('error')
        },
      )
    } catch (err) {
      setEvalText(err instanceof Error ? err.message : 'Unexpected error')
      setEvalStatus('error')
    }
  }, [nodes, edges, flowName, flowContext])

  const handleEvalTargets = useCallback(async (targetNodeIds: string[]) => {
    const ids = [...new Set(targetNodeIds)].filter(Boolean)
    if (ids.length === 0) return
    const scopedNodes = nodes.filter((n) => ids.includes(n.id))
    if (scopedNodes.length === 0) return
    const idSet = new Set(scopedNodes.map((n) => n.id))
    const scopedEdges = edges.filter((e) => idSet.has(e.source) || idSet.has(e.target))

    setAiPanelOpen(true)
    setAiPanelTab('eval')
    setEvalText('')
    setEvalStatus('loading')
    try {
      await streamEvalSuggestions(
        scopedNodes as Parameters<typeof streamEvalSuggestions>[0],
        scopedEdges,
        ids.length === 1 ? (scopedNodes[0]?.data.label ?? flowName) : `${flowName} (selection)`,
        flowContext,
        (chunk) => {
          setEvalText((t) => t + chunk)
          setEvalStatus('streaming')
        },
        () => setEvalStatus('done'),
        (msg) => {
          setEvalText(msg)
          setEvalStatus('error')
        },
      )
    } catch (err) {
      setEvalText(err instanceof Error ? err.message : 'Unexpected error')
      setEvalStatus('error')
    }
  }, [nodes, edges, flowName, flowContext])

  // Apply dark/light class to <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  // Auto-open context modal once on first visit with empty canvas
  useEffect(() => {
    const seen = localStorage.getItem(CONTEXT_PROMPT_KEY)
    const hasSavedDoc = !!loadFlow()
    if (!seen && !hasSavedDoc && nodes.length === 0 && !flowContext) {
      setContextModalMode('new')
      setContextModalOpen(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally runs once on mount

  // Restore the most recent local save on startup (unless shared URL hash is present)
  useEffect(() => {
    const hash = window.location.hash
    if (hash.startsWith('#flow=')) return

    const doc = loadFlow()
    if (!doc) return

    setNodes(doc.nodes as Node<BaseNodeData>[])
    setEdges(doc.edges)
    if (doc.name) setFlowName(doc.name)
    if (doc.layoutDirection) setLayoutDirection(doc.layoutDirection)
    setFlowContext(doc.flowContext ?? null)
    // Fit the diagram to screen after nodes render (needs a tick to measure nodes)
    window.requestAnimationFrame(() => fitView({ padding: 0.08, duration: 0 }))
  }, [setNodes, setEdges, setFlowName, setLayoutDirection, setFlowContext, fitView])

  // Load flow from URL hash on mount (#flow=<base64>)
  useEffect(() => {
    const hash = window.location.hash
    if (!hash.startsWith('#flow=')) return
    try {
      const json = atob(hash.slice('#flow='.length))
      const doc = JSON.parse(json)
      if (!Array.isArray(doc.nodes) || !Array.isArray(doc.edges)) return
      const laid = applyAutoLayout(doc.nodes, doc.edges, layoutDirection)
      setNodes(laid as Node<BaseNodeData>[])
      setEdges(doc.edges)
      if (doc.name) setFlowName(doc.name)
      // Clean up the hash without triggering a reload
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    } catch {
      // ignore malformed hash
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally runs once on mount

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      // P — toggle presentation mode
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault()
        togglePresentation()
      }
      // Space — play/pause animation
      if (e.key === ' ') {
        e.preventDefault()
        if (animation.status === 'playing') animation.pause()
        else animation.play()
      }
      // Delete / Backspace — remove selected node
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        e.preventDefault()
        removeNode(selectedNodeId)
      }
      // Ctrl+Z / Cmd+Z — undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      // Ctrl+S / Cmd+S — save to localStorage
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        saveFlow(nodes as Node<BaseNodeData>[], edges, getViewport(), flowName, flowContext, layoutDirection)
      }
    },
    [togglePresentation, animation, selectedNodeId, removeNode, undo, nodes, edges, getViewport, flowName, flowContext, layoutDirection],
  )

  const handleContextSave = useCallback((
    newName: string,
    newContext: FlowContext,
    clearCanvas: boolean,
  ) => {
    setFlowName(newName)
    setFlowContext(newContext)
    if (clearCanvas) {
      setNodes([])
      setEdges([])
    }
    localStorage.setItem(CONTEXT_PROMPT_KEY, '1')
    setContextModalOpen(false)
  }, [setFlowName, setFlowContext, setNodes, setEdges])

  const handleContextClose = useCallback(() => {
    localStorage.setItem(CONTEXT_PROMPT_KEY, '1')
    setContextModalOpen(false)
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Continuous local backup so edits survive refresh/crash.
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        saveFlow(
          nodes as Node<BaseNodeData>[],
          edges,
          getViewport(),
          flowName,
          flowContext,
          layoutDirection,
        )
      } catch (err) {
        console.error('[AgentFlow] Autosave failed:', err)
      }
    }, 700)

    return () => window.clearTimeout(timeout)
  }, [nodes, edges, getViewport, flowName, flowContext, layoutDirection])

  const animControls = (
    <AnimationControls
      status={animation.status}
      speed={animation.speed}
      disabled={nodes.length === 0}
      onPlay={animation.play}
      onPause={animation.pause}
      onReset={animation.reset}
      onSpeedChange={animation.setSpeed}
    />
  )

  const handleExportGIF = useCallback(async () => {
    if (nodes.length === 0 || exportingGIF) return
    setExportingGIF(true)

    try {
      await exportPlaybackAsGIF({
        nodes: nodes as Node<BaseNodeData>[],
        flowName,
        isDark: theme === 'dark',
        paddingPercent: gifCapturePaddingPercent,
        beforeCapture: async () => {
          animation.reset()
          await new Promise((r) => setTimeout(r, 50))
          animation.play()
        },
        isPlaybackDone: () => animationStatusRef.current === 'done',
        afterCapture: () => animation.reset(),
      })
    } catch (err) {
      console.error('[AgentFlow] GIF export failed:', err)
    } finally {
      setExportingGIF(false)
    }
  }, [nodes, exportingGIF, flowName, theme, animation, gifCapturePaddingPercent])

  const handleExportGIFSelection = useCallback(async () => {
    if (nodes.length === 0 || exportingGIF) return
    const allNodes = nodes as Node<BaseNodeData>[]
    const canvasSelected = allNodes.filter((n) => n.selected)
    const focusedNode = selectedNodeId
      ? allNodes.find((n) => n.id === selectedNodeId) ?? null
      : null

    let captureNodes = canvasSelected
    if (focusedNode?.type === 'frame') {
      captureNodes = [focusedNode]
    } else if (focusedNode && !captureNodes.some((n) => n.id === focusedNode.id)) {
      captureNodes = [focusedNode, ...captureNodes]
    }

    if (captureNodes.length === 0) return
    setExportingGIF(true)

    try {
      await exportPlaybackAsGIF({
        nodes: captureNodes,
        flowName,
        isDark: theme === 'dark',
        paddingPercent: gifCapturePaddingPercent,
        beforeCapture: async () => {
          animation.reset()
          await new Promise((r) => setTimeout(r, 50))
          animation.play()
        },
        isPlaybackDone: () => animationStatusRef.current === 'done',
        afterCapture: () => animation.reset(),
      })
    } catch (err) {
      console.error('[AgentFlow] GIF selection export failed:', err)
    } finally {
      setExportingGIF(false)
    }
  }, [nodes, selectedNodeId, exportingGIF, flowName, theme, animation, gifCapturePaddingPercent])

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0F1117] text-white">

      {/* Normal layout */}
      {!presentationMode && (
        <>
          <Toolbar
            animControls={animControls}
            onExplain={handleExplain}
            explainDisabled={nodes.length === 0 || explainStatus === 'loading' || explainStatus === 'streaming'}
            onOpenTemplates={openTemplatesPanel}
            onNewFlow={() => { setContextModalMode('new'); setContextModalOpen(true) }}
            onEditContext={() => { setContextModalMode('edit'); setContextModalOpen(true) }}
            onReview={handleReview}
            onEval={handleEval}
            hasContext={!!flowContext}
            reviewDisabled={nodes.length === 0 || reviewStatus === 'loading' || reviewStatus === 'streaming'}
            evalDisabled={nodes.length === 0 || evalStatus === 'loading' || evalStatus === 'streaming'}
            onExportGIF={handleExportGIF}
            exportGIFDisabled={nodes.length === 0 || exportingGIF}
            exportGIFBusy={exportingGIF}
            onExportGIFSelection={handleExportGIFSelection}
            exportGIFSelectionDisabled={nodes.length === 0 || exportingGIF || !nodes.some((n) => n.selected)}
          />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <FlowCanvas
              activeEdges={animation.activeEdges}
              onOpenTemplates={() => openTemplatesPanel('templates')}
              onExplainNode={(id) => handleExplain(id)}
              onEvalTargets={handleEvalTargets}
            />
            <ConfigPanel />
            <ExplainPanel
              open={aiPanelOpen}
              onClose={() => setAiPanelOpen(false)}
              activeTab={aiPanelTab}
              onTabChange={setAiPanelTab}
              explainText={explainText}
              explainStatus={explainStatus}
              reviewText={reviewText}
              reviewStatus={reviewStatus}
              reviewDisabled={nodes.length === 0 || reviewStatus === 'loading' || reviewStatus === 'streaming'}
              onGenerateReview={handleReview}
              evalText={evalText}
              evalStatus={evalStatus}
              evalDisabled={nodes.length === 0 || evalStatus === 'loading' || evalStatus === 'streaming'}
              onGenerateEval={handleEval}
            />
            <TemplatesPanel
              open={templatesOpen}
              initialTab={templatesInitialTab}
              onClose={() => setTemplatesOpen(false)}
            />
            <FlowContextModal
              open={contextModalOpen}
              mode={contextModalMode}
              initialName={flowName}
              initialContext={flowContext}
              hasNodes={nodes.length > 0}
              onSave={handleContextSave}
              onClose={handleContextClose}
            />
          </div>
        </>
      )}

      {/* Presentation mode — canvas only */}
      {presentationMode && (
        <div className="flex-1 relative">
          <FlowCanvas activeEdges={animation.activeEdges} />

          {/* Playback controls overlay */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/50 backdrop-blur-sm border border-white/10">
              {animControls}
            </div>
          </div>

          {/* Exit hint */}
          <AnimatePresence>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={togglePresentation}
              className="
                absolute top-4 right-4 z-50
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                bg-black/40 backdrop-blur-sm
                text-white/50 text-[11px] font-medium
                border border-white/10
                hover:text-white/80 hover:bg-black/60
                transition-all duration-200
              "
            >
              <Minimize2 size={12} />
              Press P to exit
            </motion.button>
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

export default function App() {
  return (
    <ReactFlowProvider>
      <AppInner />
    </ReactFlowProvider>
  )
}
