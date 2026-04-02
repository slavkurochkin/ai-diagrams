import { useCallback, useEffect, useRef, useState } from 'react'
import { useReactFlow } from 'reactflow'
import {
  Sun, Moon, Save, FolderOpen, LayoutDashboard,
  ImageDown, Copy, Maximize2, Check, Sparkles, FileCode, Share2,
  AlignVerticalJustifyStart, AlignHorizontalJustifyStart, Layers, LayoutTemplate,
  FilePlus, BookOpen, FlaskConical, ClipboardCheck, ChevronDown,
} from 'lucide-react'
import { useFlowStore } from '../../hooks/useFlowStore'
import { saveFlow, loadFlow, exportFlowAsFile } from '../../lib/flowSerializer'
import { applyAutoLayout } from '../../lib/autoLayout'
import { downloadAsPNG, copyAsPNG } from '../../lib/exportUtils'
import { serializeFlowToYAML } from '../../lib/yamlFlow'
import type { BaseNodeData } from '../../types/nodes'
import type { Node as FlowNode } from 'reactflow'

// ── Icon button ────────────────────────────────────────────────────────────────

interface IconButtonProps {
  onClick: () => void
  title: string
  children: React.ReactNode
  variant?: 'default' | 'accent' | 'ghost'
  disabled?: boolean
  active?: boolean
}

function IconButton({ onClick, title, children, variant = 'default', disabled, active = false }: IconButtonProps) {
  const classes = variant === 'accent'
    ? 'bg-teal-700/80 border-teal-500/40 text-white hover:bg-teal-600/90 hover:border-teal-400/60'
    : variant === 'ghost'
      ? 'bg-transparent border-white/10 text-white/55 hover:bg-white/7 hover:text-white'
      : active
        ? 'bg-white/10 border-white/15 text-white'
        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'

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
        ${classes}
      `}
    >
      {children}
    </button>
  )
}

interface ToolbarMenuProps {
  label: string
  title: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}

function ToolbarMenu({ label, title, open, onToggle, children }: ToolbarMenuProps) {
  return (
    <div className="relative">
      <IconButton onClick={onToggle} title={title} variant="default" active={open}>
        {label}
        <ChevronDown
          size={13}
          className="transition-transform duration-150"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </IconButton>
      {open && (
        <div
          className="
            absolute top-[calc(100%+8px)] left-0 z-30 min-w-52
            rounded-xl border border-white/12 bg-[#0B1117]
            shadow-[0_18px_42px_rgba(0,0,0,0.52)] overflow-hidden
          "
        >
          <div className="p-1.5 space-y-1 bg-[#0B1117]">
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

interface MenuActionProps {
  onClick: () => void
  icon: React.ReactNode
  label: string
  description: string
  disabled?: boolean
  tone?: 'default' | 'accent'
}

function MenuAction({ onClick, icon, label, description, disabled, tone = 'default' }: MenuActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left
        transition-colors duration-150 disabled:opacity-40 disabled:pointer-events-none
        ${tone === 'accent'
          ? 'bg-teal-950/90 text-white hover:bg-teal-900/80'
          : 'bg-[#0F1720] text-white/75 hover:bg-[#16212C] hover:text-white'}
      `}
    >
      <div className={`mt-0.5 shrink-0 ${tone === 'accent' ? 'text-cyan-300' : 'text-white/45'}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[12px] font-medium leading-tight">{label}</div>
        <div className="mt-0.5 text-[10px] leading-snug text-white/35">{description}</div>
      </div>
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
  const [openMenu, setOpenMenu] = useState<'view' | 'export' | 'ai' | null>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const toolbarRef = useRef<HTMLElement>(null)

  useEffect(() => {
  const handlePointerDown = (event: MouseEvent) => {
      if (!toolbarRef.current?.contains(event.target as globalThis.Node)) {
        setOpenMenu(null)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    return () => window.removeEventListener('mousedown', handlePointerDown)
  }, [])

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = useCallback(() => {
    const viewport = getViewport()
    saveFlow(nodes as FlowNode<BaseNodeData>[], edges, viewport, flowName, flowContext)
  }, [nodes, edges, getViewport, flowName, flowContext])

  // ── Load ────────────────────────────────────────────────────────────────────

  const handleLoad = useCallback(() => {
    const doc = loadFlow()
    if (!doc) return
    setNodes(doc.nodes as FlowNode<BaseNodeData>[])
    setEdges(doc.edges)
    if (doc.viewport) setViewport(doc.viewport)
    if (doc.name) setFlowName(doc.name)
    setFlowContext(doc.flowContext ?? null)
  }, [setNodes, setEdges, setViewport, setFlowName, setFlowContext])

  // ── Auto-layout ─────────────────────────────────────────────────────────────

  const handleTidy = useCallback(() => {
    if (nodes.length === 0) return
    const laid = applyAutoLayout(nodes, edges, layoutDirection)
    setNodes(laid as FlowNode<BaseNodeData>[])
  }, [nodes, edges, setNodes, layoutDirection])

  const handleToggleLayoutDirection = useCallback(() => {
    const nextDirection = layoutDirection === 'TB' ? 'LR' : 'TB'
    setLayoutDirection(nextDirection)
    if (nodes.length === 0) return
    const laid = applyAutoLayout(nodes, edges, nextDirection)
    setNodes(laid as FlowNode<BaseNodeData>[])
  }, [layoutDirection, setLayoutDirection, nodes, edges, setNodes])

  // ── Export ──────────────────────────────────────────────────────────────────

  const handleDownload = useCallback(async () => {
    await downloadAsPNG(nodes, flowName, theme === 'dark')
  }, [nodes, flowName, theme])

  const handleExportJSON = useCallback(() => {
    const viewport = getViewport()
    exportFlowAsFile(nodes as FlowNode<BaseNodeData>[], edges, viewport, flowName, flowContext)
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
    const yamlStr = serializeFlowToYAML(flowName, nodes as FlowNode<BaseNodeData>[], edges)
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

  const handleToggleMenu = useCallback((menu: 'view' | 'export' | 'ai') => {
    setOpenMenu((prev) => (prev === menu ? null : menu))
  }, [])

  const handleMenuAction = useCallback((action: () => void) => {
    action()
    setOpenMenu(null)
  }, [])

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
    <header
      ref={toolbarRef}
      className="
        flex items-center gap-3 px-4 h-14 shrink-0
        bg-[#0A0F14]/95 border-b border-white/5 backdrop-blur-md z-10
      "
    >

      {/* App logo + name */}
      <div className="flex items-center gap-2 shrink-0">
        <div
          className="w-5 h-5 rounded flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #0F766E, #1D4ED8)' }}
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
      <div className="flex items-center gap-1 shrink-0">
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

      {/* Grouped menus */}
      <div className="flex items-center gap-1 shrink-0">
        <ToolbarMenu
          label="View"
          title="Layout and view options"
          open={openMenu === 'view'}
          onToggle={() => handleToggleMenu('view')}
        >
          <MenuAction
            onClick={() => handleMenuAction(handleToggleLayoutDirection)}
            icon={layoutDirection === 'TB' ? <AlignVerticalJustifyStart size={14} /> : <AlignHorizontalJustifyStart size={14} />}
            label={layoutDirection === 'TB' ? 'Horizontal layout' : 'Vertical layout'}
            description={`Switch to ${layoutDirection === 'TB' ? 'left-to-right' : 'top-to-bottom'} auto layout`}
          />
          <MenuAction
            onClick={() => handleMenuAction(handleTidy)}
            icon={<LayoutDashboard size={14} />}
            label="Tidy canvas"
            description="Auto-arrange nodes with the current layout direction"
            disabled={nodes.length === 0}
          />
          <MenuAction
            onClick={() => handleMenuAction(toggleCompactMode)}
            icon={<Layers size={14} />}
            label={compactMode ? 'Switch to full view' : 'Switch to compact view'}
            description="Change how nodes render on the canvas"
          />
          <MenuAction
            onClick={() => handleMenuAction(togglePresentationMode)}
            icon={<Maximize2 size={14} />}
            label="Presentation mode"
            description="Focus on the canvas with minimal chrome"
          />
          <MenuAction
            onClick={() => handleMenuAction(handleThemeToggle)}
            icon={theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            description="Toggle the overall application theme"
          />
        </ToolbarMenu>

        <ToolbarMenu
          label="Export"
          title="Export and sharing options"
          open={openMenu === 'export'}
          onToggle={() => handleToggleMenu('export')}
        >
          <MenuAction
            onClick={() => handleMenuAction(handleExportYAML)}
            icon={<FileCode size={14} />}
            label="Export YAML"
            description="Download the flow as editable YAML"
            disabled={nodes.length === 0}
          />
          <MenuAction
            onClick={() => handleMenuAction(handleExportJSON)}
            icon={<Save size={14} />}
            label="Export JSON"
            description="Download the full flow document with viewport state"
            disabled={nodes.length === 0}
          />
          <MenuAction
            onClick={() => handleMenuAction(handleDownload)}
            icon={<ImageDown size={14} />}
            label="Export PNG"
            description="Render the current canvas as an image"
            disabled={nodes.length === 0}
          />
          <MenuAction
            onClick={() => handleMenuAction(handleCopy)}
            icon={copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
            label={copied ? 'Copied image' : 'Copy image'}
            description="Copy a PNG snapshot to the clipboard"
            disabled={nodes.length === 0}
          />
          <MenuAction
            onClick={() => handleMenuAction(handleShare)}
            icon={shared ? <Check size={14} className="text-green-400" /> : <Share2 size={14} />}
            label={shared ? 'Copied share URL' : 'Copy share URL'}
            description="Copy a shareable link with the flow encoded in the URL"
            disabled={nodes.length === 0}
          />
        </ToolbarMenu>

        <ToolbarMenu
          label="AI"
          title="AI-assisted actions"
          open={openMenu === 'ai'}
          onToggle={() => handleToggleMenu('ai')}
        >
          <MenuAction
            onClick={() => handleMenuAction(onExplain)}
            icon={<Sparkles size={14} />}
            label="Explain"
            description="Generate an explanation of the current pipeline"
            disabled={explainDisabled}
            tone="accent"
          />
          <MenuAction
            onClick={() => handleMenuAction(onReview)}
            icon={<ClipboardCheck size={14} />}
            label="Review"
            description="Find missing pieces, risks, and design issues"
            disabled={reviewDisabled}
            tone="accent"
          />
          <MenuAction
            onClick={() => handleMenuAction(onEval)}
            icon={<FlaskConical size={14} />}
            label="Eval"
            description="Suggest evaluation coverage for the flow"
            disabled={evalDisabled}
            tone="accent"
          />
        </ToolbarMenu>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="px-1.5 py-1 rounded-lg border border-white/8 bg-white/[0.03]">
          {animControls}
        </div>
        <IconButton
          onClick={handleThemeToggle}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          variant="ghost"
        >
          {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
        </IconButton>
      </div>
    </header>
  )
}
