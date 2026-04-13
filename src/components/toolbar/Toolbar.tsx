import { useCallback, useEffect, useRef, useState } from 'react'
import { useReactFlow } from 'reactflow'
import {
  Sun, Moon, Save, FolderOpen, LayoutDashboard,
  ImageDown, Copy, Maximize2, Check, Sparkles, FileCode, Share2,
  AlignVerticalJustifyStart, AlignHorizontalJustifyStart, Layers, LayoutTemplate, ListOrdered,
  FilePlus, BookOpen, FlaskConical, ClipboardCheck, ChevronDown, AlertCircle, Trash2, Info, FileCode2,
  CheckCircle2, ShieldAlert,
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

function MenuDivider() {
  return <div className="my-1 border-t border-white/10" role="separator" />
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
  /** Open templates panel; `import` opens the Import YAML tab. */
  onOpenTemplates: (tab?: 'templates' | 'import') => void
  onNewFlow: () => void
  onEditContext: () => void
  onReview: () => void
  onEval: () => void
  onSuccess: () => void
  onRisks: () => void
  hasContext: boolean
  reviewDisabled?: boolean
  evalDisabled?: boolean
  successDisabled?: boolean
  risksDisabled?: boolean
  onExportGIF: () => void
  exportGIFDisabled?: boolean
  exportGIFBusy?: boolean
  onExportGIFSelection: () => void
  exportGIFSelectionDisabled?: boolean
  onGeneratePrompt: () => void
  generatePromptDisabled?: boolean
}

export default function Toolbar({
  animControls,
  onExplain,
  explainDisabled,
  onOpenTemplates,
  onNewFlow,
  onEditContext,
  onReview,
  onEval,
  onSuccess,
  onRisks,
  hasContext,
  reviewDisabled,
  evalDisabled,
  successDisabled,
  risksDisabled,
  onExportGIF,
  exportGIFDisabled,
  exportGIFBusy,
  onExportGIFSelection,
  exportGIFSelectionDisabled,
  onGeneratePrompt,
  generatePromptDisabled,
}: ToolbarProps) {
  const {
    nodes, edges, theme, setTheme, setNodes, setEdges,
    flowName, setFlowName, togglePresentationMode,
    compactMode, toggleCompactMode,
    layoutDirection, setLayoutDirection,
    flowContext, setFlowContext,
    createFrameFromSelection,
    showExecutionPriorities, toggleExecutionPriorities,
    showAllNotes, toggleShowAllNotes,
    hideNotesDuringPlayback, toggleHideNotesDuringPlayback,
    globalPathThickness, setGlobalPathThickness,
    globalPathColor, setGlobalPathColor,
    gifCapturePaddingPercent, setGifCapturePaddingPercent,
  } = useFlowStore()
  const { getViewport, setViewport } = useReactFlow()

  const [editingName, setEditingName] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)
  const [openMenu, setOpenMenu] = useState<'flow' | 'view' | 'export' | 'ai' | null>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const toolbarRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const toolbarEl = toolbarRef.current
      if (!toolbarEl) return

      const path = event.composedPath?.() ?? []
      const clickedInsideToolbar = path.includes(toolbarEl)

      if (!clickedInsideToolbar) {
        setOpenMenu(null)
      }
    }

    // Capture phase avoids cases where inner handlers stop bubbling.
    document.addEventListener('pointerdown', handlePointerDown, true)
    return () => document.removeEventListener('pointerdown', handlePointerDown, true)
  }, [])

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = useCallback(() => {
    try {
      const viewport = getViewport()
      saveFlow(nodes as FlowNode<BaseNodeData>[], edges, viewport, flowName, flowContext, layoutDirection)
      setSaveFailed(false)
      setSaved(true)
      window.setTimeout(() => setSaved(false), 1600)
    } catch (err) {
      console.error('[AgentFlow] Save failed:', err)
      setSaved(false)
      setSaveFailed(true)
      window.setTimeout(() => setSaveFailed(false), 2200)
    }
  }, [nodes, edges, getViewport, flowName, flowContext, layoutDirection])

  // ── Load ────────────────────────────────────────────────────────────────────

  const handleLoad = useCallback(() => {
    const doc = loadFlow()
    if (!doc) return
    setNodes(doc.nodes as FlowNode<BaseNodeData>[])
    setEdges(doc.edges)
    if (doc.viewport) setViewport(doc.viewport)
    if (doc.name) setFlowName(doc.name)
    if (doc.layoutDirection) setLayoutDirection(doc.layoutDirection)
    setFlowContext(doc.flowContext ?? null)
  }, [setNodes, setEdges, setViewport, setFlowName, setLayoutDirection, setFlowContext])

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
    const yamlStr = serializeFlowToYAML(flowName, nodes as FlowNode<BaseNodeData>[], edges, layoutDirection)
    const blob = new Blob([yamlStr], { type: 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const ts = new Date().toISOString().slice(0, 10)
    a.download = `${flowName.toLowerCase().replace(/\s+/g, '-')}-${ts}.yaml`
    a.click()
    URL.revokeObjectURL(url)
  }, [nodes, edges, flowName, layoutDirection])

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

  const handleToggleMenu = useCallback((menu: 'flow' | 'view' | 'export' | 'ai') => {
    setOpenMenu((prev) => (prev === menu ? null : menu))
  }, [])

  const handleMenuAction = useCallback((action: () => void) => {
    action()
    setOpenMenu(null)
  }, [])
  const selectedNonFrameCount = nodes.filter((n) => n.selected && n.type !== 'frame').length

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
    <>
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

      {/* Flow details button */}
      <button
        type="button"
        onClick={onEditContext}
        title={hasContext ? 'View / edit flow context' : 'Set up flow context'}
        className={`
          flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg shrink-0
          text-[11px] font-medium border transition-colors duration-150
          ${hasContext
            ? 'text-sky-300/80 bg-sky-900/20 border-sky-700/30 hover:bg-sky-900/35 hover:text-sky-200'
            : 'text-white/35 bg-transparent border-white/8 hover:bg-white/6 hover:text-white/60'}
        `}
      >
        <Info size={12} />
        {hasContext ? 'Flow details' : 'Add details'}
        {hasContext && (
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400/70 shrink-0" />
        )}
      </button>

      <div className="w-px h-5 bg-white/10 shrink-0" />

      {/* Grouped menus */}
      <div className="flex items-center gap-1 shrink-0">
        <ToolbarMenu
          label="Flow"
          title="New flow, templates, load, and document export"
          open={openMenu === 'flow'}
          onToggle={() => handleToggleMenu('flow')}
        >
          <MenuAction
            onClick={() => handleMenuAction(onNewFlow)}
            icon={<FilePlus size={14} />}
            label="New flow"
            description="Open the new-flow dialog"
          />
          {hasContext && (
            <MenuAction
              onClick={() => handleMenuAction(onEditContext)}
              icon={<BookOpen size={14} />}
              label="Flow context"
              description="Edit context and business documents"
            />
          )}
          <MenuAction
            onClick={() => handleMenuAction(() => onOpenTemplates('templates'))}
            icon={<LayoutTemplate size={14} />}
            label="Browse templates"
            description="Starter flows and built-in layouts"
          />
          <MenuAction
            onClick={() => handleMenuAction(() => onOpenTemplates('import'))}
            icon={<FileCode size={14} />}
            label="Import YAML"
            description="Paste or upload a .yaml file"
          />
          <MenuAction
            onClick={() => handleMenuAction(handleLoad)}
            icon={<FolderOpen size={14} />}
            label="Load from browser"
            description="Restore the last flow saved in this browser"
          />
          <MenuDivider />
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
            description="Full document with viewport for backup"
            disabled={nodes.length === 0}
          />
        </ToolbarMenu>

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
            onClick={() => handleMenuAction(() => { createFrameFromSelection() })}
            icon={<Layers size={14} />}
            label="Group selected nodes"
            description="Create an auto-sized frame around selected nodes"
            disabled={selectedNonFrameCount === 0}
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
            onClick={() => handleMenuAction(toggleExecutionPriorities)}
            icon={<ListOrdered size={14} />}
            label={showExecutionPriorities ? 'Hide execution priorities' : 'Show execution priorities'}
            description="Toggle P1/P2 priority badges on all paths"
          />
          <MenuAction
            onClick={() => handleMenuAction(toggleShowAllNotes)}
            icon={<BookOpen size={14} />}
            label={showAllNotes ? 'Hide all notes' : 'Show all notes'}
            description="Temporarily show every node note for layout tuning"
          />
          <MenuAction
            onClick={() => handleMenuAction(toggleHideNotesDuringPlayback)}
            icon={<BookOpen size={14} />}
            label={hideNotesDuringPlayback ? 'Show notes while playing' : 'Hide notes while playing'}
            description="Automatically hide note cards during playback"
          />
          <MenuAction
            onClick={() => handleMenuAction(handleThemeToggle)}
            icon={theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            description="Toggle the overall application theme"
          />
          <div className="px-3 py-2 rounded-lg bg-[#0F1720] border border-white/10">
            <div className="text-[10px] uppercase tracking-wide text-white/45 mb-1.5">
              Global Path Thickness
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0.5}
                max={4}
                step={0.25}
                value={globalPathThickness}
                onChange={(e) => setGlobalPathThickness(Number(e.target.value))}
                className="
                  w-20 px-2 py-1 rounded-md text-[11px]
                  bg-white/5 border border-white/10 text-white/85
                  focus:outline-none focus:border-white/30
                "
              />
              <span className="text-[11px] text-white/45">x</span>
            </div>
          </div>
          <div className="px-3 py-2 rounded-lg bg-[#0F1720] border border-white/10">
            <div className="text-[10px] uppercase tracking-wide text-white/45 mb-1.5">
              Global Path Color
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={globalPathColor}
                onChange={(e) => setGlobalPathColor(e.target.value)}
                className="h-8 w-10 rounded border border-white/10 bg-transparent cursor-pointer"
              />
              <span className="text-[11px] font-mono text-white/45">{globalPathColor}</span>
            </div>
          </div>
        </ToolbarMenu>

        <ToolbarMenu
          label="Export"
          title="Images, GIF, and sharing"
          open={openMenu === 'export'}
          onToggle={() => handleToggleMenu('export')}
        >
          <MenuAction
            onClick={() => handleMenuAction(handleDownload)}
            icon={<ImageDown size={14} />}
            label="Export PNG"
            description="Render the current canvas as an image"
            disabled={nodes.length === 0}
          />
          <MenuAction
            onClick={() => handleMenuAction(onExportGIF)}
            icon={<ImageDown size={14} />}
            label={exportGIFBusy ? 'Export GIF (recording...)' : 'Export GIF (1 cycle)'}
            description="Record playback once and download an animated GIF"
            disabled={exportGIFDisabled}
          />
          <MenuAction
            onClick={() => handleMenuAction(onExportGIFSelection)}
            icon={<ImageDown size={14} />}
            label="Export GIF (selection)"
            description="Export only currently selected nodes/frame"
            disabled={exportGIFSelectionDisabled}
          />
          <div className="px-3 py-2 rounded-lg bg-[#0F1720] border border-white/10">
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[10px] uppercase tracking-wide text-white/45">
                GIF Capture Padding
              </div>
              <span className="text-[11px] font-mono text-white/55">
                {gifCapturePaddingPercent}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={40}
              step={1}
              value={gifCapturePaddingPercent}
              onChange={(e) => setGifCapturePaddingPercent(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>
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
          <MenuAction
            onClick={() => handleMenuAction(onSuccess)}
            icon={<CheckCircle2 size={14} />}
            label="Success criteria"
            description="Define what 'working correctly' looks like for this flow"
            disabled={successDisabled}
            tone="accent"
          />
          <MenuAction
            onClick={() => handleMenuAction(onRisks)}
            icon={<ShieldAlert size={14} />}
            label="Risk analysis"
            description="Identify failure modes and architectural risks"
            disabled={risksDisabled}
            tone="accent"
          />
          <MenuAction
            onClick={() => handleMenuAction(onGeneratePrompt)}
            icon={<FileCode2 size={14} />}
            label="Generate prompt"
            description="Create an implementation brief for coding agents"
            disabled={generatePromptDisabled}
            tone="accent"
          />
        </ToolbarMenu>

        <div className="w-px h-5 bg-white/10 shrink-0 self-center" />

        <IconButton
          onClick={handleSave}
          title={saveFailed ? 'Save failed (check browser storage permissions)' : 'Save to browser (Ctrl+S)'}
          variant="accent"
        >
          {saved ? <Check size={13} /> : saveFailed ? <AlertCircle size={13} className="text-red-300" /> : <Save size={13} />}
          {saveFailed ? 'Save failed' : saved ? 'Saved' : 'Save'}
        </IconButton>

        <IconButton
          onClick={() => setConfirmClear(true)}
          title="Clear canvas"
          variant="ghost"
        >
          <Trash2 size={13} />
          Clear
        </IconButton>
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

    {/* Clear canvas confirmation modal */}
    {confirmClear && (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.55)' }}
        onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirmClear(false) }}
      >
        <div className="bg-gray-950 border border-white/10 rounded-2xl shadow-2xl p-6 w-[320px] flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[14px] font-semibold text-white">Clear canvas?</span>
            <span className="text-[12px] text-white/50">This will remove all nodes and edges. This action cannot be undone.</span>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setConfirmClear(false)}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setNodes([])
                setEdges([])
                setConfirmClear(false)
              }}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-white bg-red-700/80 hover:bg-red-600/90 border border-red-500/40 transition-colors"
            >
              Clear canvas
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
