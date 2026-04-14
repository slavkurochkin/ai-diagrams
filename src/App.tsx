import { useEffect, useCallback, useRef, useState } from 'react'
import { ReactFlowProvider, useReactFlow } from 'reactflow'
import { motion, AnimatePresence } from 'framer-motion'
import { Minimize2 } from 'lucide-react'
import FlowCanvas from './components/canvas/FlowCanvas'
import Sidebar from './components/panels/Sidebar'
import Toolbar from './components/toolbar/Toolbar'
import ConfigPanel from './components/panels/ConfigPanel'
import ExplainPanel from './components/panels/ExplainPanel'
import PromptPanel from './components/panels/PromptPanel'
import TemplatesPanel from './components/panels/TemplatesPanel'
import FlowContextModal from './components/panels/FlowContextModal'
import AnimationControls from './components/animation/AnimationControls'
import DrawingOverlay from './components/presentation/DrawingOverlay'
import { useFlowStore } from './hooks/useFlowStore'
import { useFlowAnimation } from './hooks/useFlowAnimation'
import { streamExplain } from './lib/api/explain'
import { generateImplementationPrompt } from './lib/promptGenerator'
import { streamEvalSuggestions } from './lib/api/evalSuggestions'
import { streamDesignReview } from './lib/api/designReview'
import { streamSuccessCriteria, streamRiskAnalysis } from './lib/api/successRisks'
import { saveFlow, loadFlow } from './lib/flowSerializer'
import { applyAutoLayout } from './lib/autoLayout'
import { exportPlaybackAsGIF } from './lib/exportUtils'
import type { Node } from 'reactflow'
import type { BaseNodeData } from './types/nodes'
import type { FlowContext } from './types/flow'

const CONTEXT_PROMPT_KEY = 'agentflow:contextPromptSeen'

// Inner component — needs to be inside ReactFlowProvider to use useFlowAnimation
function AppInner() {
  const { getViewport, fitView } = useReactFlow()
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
  const [contextDraft, setContextDraft] = useState<FlowContext | null>(null)

  type PanelStatus = 'idle' | 'loading' | 'streaming' | 'done' | 'error'

  // AI panel (explain + review + eval + success + risks tabs)
  const [aiPanelOpen, setAiPanelOpen]         = useState(false)
  const [aiPanelTab, setAiPanelTab]           = useState<
    'explain' | 'review' | 'eval' | 'success' | 'risks' | 'build'
  >('explain')

  const [promptPanelOpen, setPromptPanelOpen] = useState(false)
  const [generatedPrompt, setGeneratedPrompt] = useState('')

  const [explainText, setExplainText]         = useState('')
  const [explainStatus, setExplainStatus]     = useState<PanelStatus>('idle')
  const [explainNodeId, setExplainNodeId]     = useState<string | undefined>(undefined)

  const [reviewText, setReviewText]           = useState('')
  const [reviewStatus, setReviewStatus]       = useState<PanelStatus>('idle')

  const [evalText, setEvalText]               = useState('')
  const [evalStatus, setEvalStatus]           = useState<PanelStatus>('idle')

  const [successText, setSuccessText]         = useState('')
  const [successStatus, setSuccessStatus]     = useState<PanelStatus>('idle')
  const [successNodeId, setSuccessNodeId]     = useState<string | undefined>(undefined)

  const [risksText, setRisksText]             = useState('')
  const [risksStatus, setRisksStatus]         = useState<PanelStatus>('idle')
  const [risksNodeId, setRisksNodeId]         = useState<string | undefined>(undefined)

  useEffect(() => {
    animationStatusRef.current = animation.status
  }, [animation.status])

  const handleExplain = useCallback(async (nodeId?: string) => {
    setAiPanelOpen(true)
    setAiPanelTab('explain')
    setExplainText('')
    setExplainStatus('loading')
    setExplainNodeId(nodeId)

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

  const handleSuccess = useCallback(async (nodeId?: string) => {
    setAiPanelOpen(true)
    setAiPanelTab('success')
    setSuccessText('')
    setSuccessStatus('loading')
    setSuccessNodeId(nodeId)
    try {
      await streamSuccessCriteria(
        nodes as Parameters<typeof streamSuccessCriteria>[0],
        edges,
        flowName,
        flowContext,
        (chunk) => { setSuccessText((t) => t + chunk); setSuccessStatus('streaming') },
        () => setSuccessStatus('done'),
        (msg) => { setSuccessText(msg); setSuccessStatus('error') },
        nodeId,
      )
    } catch (err) {
      setSuccessText(err instanceof Error ? err.message : 'Unexpected error')
      setSuccessStatus('error')
    }
  }, [nodes, edges, flowName, flowContext])

  const handleRisks = useCallback(async (nodeId?: string) => {
    setAiPanelOpen(true)
    setAiPanelTab('risks')
    setRisksText('')
    setRisksStatus('loading')
    setRisksNodeId(nodeId)
    try {
      await streamRiskAnalysis(
        nodes as Parameters<typeof streamRiskAnalysis>[0],
        edges,
        flowName,
        flowContext,
        (chunk) => { setRisksText((t) => t + chunk); setRisksStatus('streaming') },
        () => setRisksStatus('done'),
        (msg) => { setRisksText(msg); setRisksStatus('error') },
        nodeId,
      )
    } catch (err) {
      setRisksText(err instanceof Error ? err.message : 'Unexpected error')
      setRisksStatus('error')
    }
  }, [nodes, edges, flowName, flowContext])

  const handleGeneratePrompt = useCallback(() => {
    const prompt = generateImplementationPrompt(flowName, nodes as Node<BaseNodeData>[], edges, flowContext)
    setGeneratedPrompt(prompt)
    setPromptPanelOpen(true)
  }, [flowName, nodes, edges, flowContext])

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
      // Space — play/pause; in presentation mode paused state, advance one step
      if (e.key === ' ') {
        e.preventDefault()
        if (animation.status === 'playing') animation.pause()
        else if (presentationMode && animation.status === 'paused') animation.step()
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
    setContextDraft(null)
    if (clearCanvas) {
      setNodes([])
      setEdges([])
    }
    localStorage.setItem(CONTEXT_PROMPT_KEY, '1')
    setContextModalOpen(false)
  }, [setFlowName, setFlowContext, setNodes, setEdges])

  const handleContextClose = useCallback(() => {
    localStorage.setItem(CONTEXT_PROMPT_KEY, '1')
    setContextDraft(null)
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

  const presentationAnimControls = (
    <AnimationControls
      status={animation.status}
      speed={animation.speed}
      disabled={nodes.length === 0}
      onPlay={animation.play}
      onPause={animation.pause}
      onReset={animation.reset}
      onSpeedChange={animation.setSpeed}
      onStep={animation.step}
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
    <div
      className={`
        flex flex-col h-screen w-screen overflow-hidden
        ${theme === 'dark' ? 'bg-[#0F1117] text-white' : 'bg-[#f4f7ff] text-slate-900'}
      `}
    >

      {/* Normal layout */}
      {!presentationMode && (
        <>
          <Toolbar
            animControls={animControls}
            onExplain={handleExplain}
            explainDisabled={nodes.length === 0 || explainStatus === 'loading' || explainStatus === 'streaming'}
            onOpenTemplates={openTemplatesPanel}
            onNewFlow={() => { setContextDraft(null); setContextModalMode('new'); setContextModalOpen(true) }}
            onEditContext={() => { setContextDraft(null); setContextModalMode('edit'); setContextModalOpen(true) }}
            onReview={handleReview}
            onEval={handleEval}
            onSuccess={() => handleSuccess()}
            onRisks={() => handleRisks()}
            hasContext={!!flowContext}
            reviewDisabled={nodes.length === 0 || reviewStatus === 'loading' || reviewStatus === 'streaming'}
            evalDisabled={nodes.length === 0 || evalStatus === 'loading' || evalStatus === 'streaming'}
            successDisabled={nodes.length === 0 || successStatus === 'loading' || successStatus === 'streaming'}
            risksDisabled={nodes.length === 0 || risksStatus === 'loading' || risksStatus === 'streaming'}
            onExportGIF={handleExportGIF}
            exportGIFDisabled={nodes.length === 0 || exportingGIF}
            exportGIFBusy={exportingGIF}
            onExportGIFSelection={handleExportGIFSelection}
            exportGIFSelectionDisabled={nodes.length === 0 || exportingGIF || !nodes.some((n) => n.selected)}
            onGeneratePrompt={handleGeneratePrompt}
            generatePromptDisabled={nodes.length === 0}
            onWorkflowChat={() => {
              if (aiPanelOpen && aiPanelTab === 'build') {
                setAiPanelOpen(false)
              } else {
                setAiPanelOpen(true)
                setAiPanelTab('build')
              }
            }}
          />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <FlowCanvas
              activeEdges={animation.activeEdges}
              onOpenTemplates={() => openTemplatesPanel('templates')}
              onExplainNode={(id) => handleExplain(id)}
              onEvalTargets={handleEvalTargets}
              onPlayFromNode={(id) => { animation.reset(); animation.playFrom(id) }}
              onSuccessNode={(id) => handleSuccess(id)}
              onRisksNode={(id) => handleRisks(id)}
            />
            <ConfigPanel />
            <ExplainPanel
              open={aiPanelOpen}
              onClose={() => setAiPanelOpen(false)}
              activeTab={aiPanelTab}
              onTabChange={setAiPanelTab}
              explainText={explainText}
              explainStatus={explainStatus}
              explainDisabled={nodes.length === 0 || explainStatus === 'loading' || explainStatus === 'streaming'}
              onGenerateExplain={() => handleExplain(explainNodeId)}
              reviewText={reviewText}
              reviewStatus={reviewStatus}
              reviewDisabled={nodes.length === 0 || reviewStatus === 'loading' || reviewStatus === 'streaming'}
              onGenerateReview={handleReview}
              evalText={evalText}
              evalStatus={evalStatus}
              evalDisabled={nodes.length === 0 || evalStatus === 'loading' || evalStatus === 'streaming'}
              onGenerateEval={handleEval}
              successText={successText}
              successStatus={successStatus}
              successDisabled={nodes.length === 0 || successStatus === 'loading' || successStatus === 'streaming'}
              onGenerateSuccess={() => handleSuccess(successNodeId)}
              risksText={risksText}
              risksStatus={risksStatus}
              risksDisabled={nodes.length === 0 || risksStatus === 'loading' || risksStatus === 'streaming'}
              onGenerateRisks={() => handleRisks(risksNodeId)}
              onUseReviewInContext={(draft) => {
                setContextModalMode('edit')
                setContextDraft({
                  description: draft.description,
                  howItWorks: draft.howItWorks,
                  documents: flowContext?.documents ?? [],
                })
                setContextModalOpen(true)
              }}
            />
            <TemplatesPanel
              open={templatesOpen}
              initialTab={templatesInitialTab}
              onClose={() => setTemplatesOpen(false)}
            />
            <PromptPanel
              open={promptPanelOpen}
              prompt={generatedPrompt}
              onClose={() => setPromptPanelOpen(false)}
            />
            <FlowContextModal
              open={contextModalOpen}
              mode={contextModalMode}
              initialName={flowName}
              initialContext={contextDraft ?? flowContext}
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
          <DrawingOverlay />

          {/* Playback controls overlay */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-xl backdrop-blur-sm border"
              style={theme === 'dark'
                ? { background: 'rgba(0,0,0,0.5)', borderColor: 'rgba(255,255,255,0.1)' }
                : { background: 'rgba(255,255,255,0.92)', borderColor: 'rgba(99,102,241,0.24)' }
              }
            >
              {presentationAnimControls}
            </div>
          </div>

          {/* Exit hint */}
          <AnimatePresence>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={togglePresentation}
              className={`
                absolute top-4 right-4 z-50
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                backdrop-blur-sm text-[11px] font-medium
                border transition-all duration-200
                ${theme === 'dark'
                  ? 'text-white/50 border-white/10 hover:text-white/80'
                  : 'text-slate-600 border-indigo-300/60 hover:text-slate-900'}
              `}
              style={theme === 'dark'
                ? { background: 'rgba(0,0,0,0.4)' }
                : { background: 'rgba(255,255,255,0.92)' }
              }
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
