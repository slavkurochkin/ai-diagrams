import { useCallback, useRef, useState } from 'react'
import { useReactFlow } from 'reactflow'
import {
  Sun, Moon, Save, FolderOpen, LayoutDashboard,
  ImageDown, Copy, Maximize2, Check, Sparkles, FileCode, Share2,
  AlignVerticalJustifyStart, AlignHorizontalJustifyStart, Layers, LayoutTemplate,
  FilePlus, BookOpen, FlaskConical, ClipboardCheck,
} from 'lucide-react'
import { useFlowStore } from '../../hooks/useFlowStore'
import { saveFlow, loadFlow, exportFlowAsFile } from '../../lib/flowSerializer'
import { applyAutoLayout } from '../../lib/autoLayout'
import { downloadAsPNG, copyAsPNG } from '../../lib/exportUtils'
import { serializeFlowToYAML } from '../../lib/yamlFlow'
import type { BaseNodeData } from '../../types/nodes'
import type { Node } from 'reactflow'

// ── Icon button ────────────────────────────────────────────────────────────────

interface IconButtonProps {
  onClick: () => void
  title: string
  children: React.ReactNode
  variant?: 'default' | 'accent'
  disabled?: boolean
}

function IconButton({ onClick, title, children, variant = 'default', disabled }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`
        flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-medium
        border transition-all duration-150 select-none
        disabled:opacity-40 disabled:pointer-events-none
        ${
          variant === 'accent'
            ? 'bg-violet-700/80 border-violet-500/40 text-white hover:bg-violet-600/90 hover:border-violet-400/60'
            : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
        }
      `}
    >
      {children}
    </button>
  )
}

// ── Toolbar ────────────────────────────────────────────────────────────────────

interface ToolbarProps {
  animControls: React.ReactNode
  onExplain: () => void
  explainDisabled?: boolean
  onTemplates: () => void
  onNewFlow: () => void
  onEditContext: () => void
  onReview: () => void
  onEval: () => void
  hasContext: boolean
  reviewDisabled?: boolean
  evalDisabled?: boolean
}

export default function Toolbar({ animControls, onExplain, explainDisabled, onTemplates, onNewFlow, onEditContext, onReview, onEval, hasContext, reviewDisabled, evalDisabled }: ToolbarProps) {
  const {
    nodes, edges, theme, setTheme, setNodes, setEdges,
    flowName, setFlowName, togglePresentationMode,
    compactMode, toggleCompactMode,
    layoutDirection, setLayoutDirection,
    flowContext, setFlowContext,
  } = useFlowStore()
  const { getViewport, setViewport } = useReactFlow()

  const [editingName, setEditingName] = useState(false)
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = useCallback(() => {
    const viewport = getViewport()
    saveFlow(nodes as Node<BaseNodeData>[], edges, viewport, flowName, flowContext)
  }, [nodes, edges, getViewport, flowName, flowContext])

  // ── Load ────────────────────────────────────────────────────────────────────

  const handleLoad = useCallback(() => {
    const doc = loadFlow()
    if (!doc) return
    setNodes(doc.nodes as Node<BaseNodeData>[])
    setEdges(doc.edges)
    if (doc.viewport) setViewport(doc.viewport)
    if (doc.name) setFlowName(doc.name)
    setFlowContext(doc.flowContext ?? null)
  }, [setNodes, setEdges, setViewport, setFlowName, setFlowContext])

  // ── Auto-layout ─────────────────────────────────────────────────────────────

  const handleTidy = useCallback(() => {
    if (nodes.length === 0) return
    const laid = applyAutoLayout(nodes, edges, layoutDirection)
    setNodes(laid as Node<BaseNodeData>[])
  }, [nodes, edges, setNodes, layoutDirection])

  const handleToggleLayoutDirection = useCallback(() => {
    const nextDirection = layoutDirection === 'TB' ? 'LR' : 'TB'
    setLayoutDirection(nextDirection)
    if (nodes.length === 0) return
    const laid = applyAutoLayout(nodes, edges, nextDirection)
    setNodes(laid as Node<BaseNodeData>[])
  }, [layoutDirection, setLayoutDirection, nodes, edges, setNodes])

  // ── Export ──────────────────────────────────────────────────────────────────

  const handleDownload = useCallback(async () => {
    await downloadAsPNG(nodes, flowName, theme === 'dark')
  }, [nodes, flowName, theme])

  const handleExportJSON = useCallback(() => {
    const viewport = getViewport()
    exportFlowAsFile(nodes as Node<BaseNodeData>[], edges, viewport, flowName, flowContext)
  }, [nodes, edges, getViewport, flowName, flowContext])

  const handleShare = useCallback(async () => {
    const doc = {
      name: flowName,
      nodes,
      edges,
      viewport: getViewport(),
    }
    const encoded = btoa(JSON.stringify(doc))
    const url = `${window.location.origin}${window.location.pathname}#flow=${encoded}`
    try {
      await navigator.clipboard.writeText(url)
      setShared(true)
      setTimeout(() => setShared(false), 2500)
    } catch {
      // fallback: put in address bar
      window.location.hash = `flow=${encoded}`
    }
  }, [nodes, edges, flowName, getViewport])

  const handleExportYAML = useCallback(() => {
    const yamlStr = serializeFlowToYAML(flowName, nodes as Node<BaseNodeData>[], edges)
    const blob = new Blob([yamlStr], { type: 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const ts = new Date().toISOString().slice(0, 10)
    a.download = `${flowName.toLowerCase().replace(/\s+/g, '-')}-${ts}.yaml`
    a.click()
    URL.revokeObjectURL(url)
  }, [nodes, edges, flowName])

  const handleCopy = useCallback(async () => {
    try {
      await copyAsPNG(nodes, theme === 'dark')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('[AgentFlow] Copy failed:', err)
    }
  }, [nodes, theme])

  // ── Theme toggle ─────────────────────────────────────────────────────────────

  const handleThemeToggle = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  // ── Diagram name ─────────────────────────────────────────────────────────────

  const handleNameBlur = useCallback(() => {
    setEditingName(false)
  }, [])

  const handleNameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      setEditingName(false)
      nameInputRef.current?.blur()
    }
  }, [])

  return (
    <header className="flex items-center gap-2 px-4 h-12 shrink-0 bg-gray-950/95 border-b border-white/5 backdrop-blur-sm z-10">

      {/* App logo + name */}
      <div className="flex items-center gap-2 shrink-0">
        <div
          className="w-5 h-5 rounded flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #2563EB)' }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="white">
            <circle cx="2" cy="5" r="1.5" />
            <circle cx="8" cy="2" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <line x1="3.4" y1="4.3" x2="6.6" y2="2.7" stroke="white" strokeWidth="1" />
            <line x1="3.4" y1="5.7" x2="6.6" y2="7.3" stroke="white" strokeWidth="1" />
          </svg>
        </div>
        <span className="text-[13px] font-semibold text-white tracking-tight">
          AgentFlow
        </span>
      </div>

      <div className="w-px h-5 bg-white/10 shrink-0" />

      {/* Editable diagram name */}
      {editingName ? (
        <input
          ref={nameInputRef}
          autoFocus
          value={flowName}
          onChange={(e) => setFlowName(e.target.value)}
          onBlur={handleNameBlur}
          onKeyDown={handleNameKeyDown}
          className="
            px-2 py-1 rounded-md text-[13px] font-medium text-white
            bg-white/10 border border-white/20 focus:outline-none
            min-w-0 w-44
          "
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditingName(true)}
          title="Click to rename"
          className="
            px-2 py-1 rounded-md text-[13px] font-medium text-white/70
            hover:text-white hover:bg-white/10 transition-colors duration-150
            truncate max-w-[180px]
          "
        >
          {flowName}
        </button>
      )}

      <div className="w-px h-5 bg-white/10 shrink-0" />

      {/* Primary actions */}
      <div className="flex items-center gap-1">
        <IconButton onClick={onNewFlow} title="Start a new flow">
          <FilePlus size={13} />
          New Flow
        </IconButton>
        {hasContext && (
          <IconButton onClick={onEditContext} title="Edit flow context and business documents">
            <BookOpen size={13} />
            Context
          </IconButton>
        )}
        <IconButton onClick={onTemplates} title="Browse templates / import YAML">
          <LayoutTemplate size={13} />
          Templates
        </IconButton>
        <IconButton onClick={handleSave} title="Save to browser (Ctrl+S)" variant="accent">
          <Save size={13} />
          Save
        </IconButton>
        <IconButton onClick={handleLoad} title="Load from browser storage">
          <FolderOpen size={13} />
          Load
        </IconButton>
      </div>

      <div className="w-px h-5 bg-white/10 shrink-0" />

      {/* Layout + export */}
      <div className="flex items-center gap-1">
        <IconButton
          onClick={handleToggleLayoutDirection}
          title={`Switch to ${layoutDirection === 'TB' ? 'horizontal' : 'vertical'} layout`}
        >
          {layoutDirection === 'TB'
            ? <AlignVerticalJustifyStart size={13} />
            : <AlignHorizontalJustifyStart size={13} />}
        </IconButton>
        <IconButton
          onClick={handleTidy}
          title="Auto-layout nodes (dagre)"
          disabled={nodes.length === 0}
        >
          <LayoutDashboard size={13} />
          Tidy
        </IconButton>

        <IconButton
          onClick={handleExportYAML}
          title="Export flow as YAML"
          disabled={nodes.length === 0}
        >
          <FileCode size={13} />
          YAML
        </IconButton>

        <IconButton
          onClick={handleExportJSON}
          title="Export flow as JSON"
          disabled={nodes.length === 0}
        >
          <Save size={13} />
          JSON
        </IconButton>

        <IconButton
          onClick={handleDownload}
          title="Export as PNG"
          disabled={nodes.length === 0}
        >
          <ImageDown size={13} />
          PNG
        </IconButton>

        <IconButton
          onClick={handleCopy}
          title="Copy to clipboard"
          disabled={nodes.length === 0}
        >
          {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
          {copied ? 'Copied!' : 'Copy'}
        </IconButton>

        <IconButton
          onClick={handleShare}
          title="Copy shareable URL to clipboard"
          disabled={nodes.length === 0}
        >
          {shared ? <Check size={13} className="text-green-400" /> : <Share2 size={13} />}
          {shared ? 'Copied!' : 'Share'}
        </IconButton>
      </div>

      <div className="w-px h-5 bg-white/10 shrink-0" />

      {/* Animation controls */}
      {animControls}

      <div className="w-px h-5 bg-white/10 shrink-0" />

      {/* AI actions */}
      <div className="flex items-center gap-1">
        <IconButton
          onClick={onExplain}
          title="Explain pipeline with AI"
          variant="accent"
          disabled={explainDisabled}
        >
          <Sparkles size={13} />
          Explain
        </IconButton>
        <IconButton
          onClick={onReview}
          title="Review design — missing components and improvements"
          variant="accent"
          disabled={reviewDisabled}
        >
          <ClipboardCheck size={13} />
          Review
        </IconButton>
        <IconButton
          onClick={onEval}
          title="Get evaluation suggestions for this flow"
          variant="accent"
          disabled={evalDisabled}
        >
          <FlaskConical size={13} />
          Eval
        </IconButton>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side */}
      <div className="flex items-center gap-1">
        <IconButton
          onClick={toggleCompactMode}
          title={compactMode ? 'Switch to full view' : 'Switch to compact view'}
          variant={compactMode ? 'accent' : 'default'}
        >
          <Layers size={13} />
        </IconButton>
        <IconButton
          onClick={togglePresentationMode}
          title="Presentation mode (P)"
        >
          <Maximize2 size={13} />
        </IconButton>

        <IconButton
          onClick={handleThemeToggle}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
        </IconButton>
      </div>
    </header>
  )
}
