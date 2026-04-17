import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Node, Edge } from 'reactflow'
import { X, Plus, Trash2, Upload, FileText, ChevronDown, ChevronUp, Sparkles, RotateCcw, Wand2, Loader2, Copy, Check, Download } from 'lucide-react'
import type { FlowContext, FlowContextDocument } from '../../types/flow'
import type { BaseNodeData } from '../../types/nodes'
import { useFlowStore } from '../../hooks/useFlowStore'
import { synthesizeFlowContextFromDiagram } from '../../lib/api/flowContextSynthesize'
import {
  codingAgentMarkdownFilename,
  generateCodingAgentMarkdownPack,
} from '../../lib/promptGenerator'

// ── Example data ───────────────────────────────────────────────────────────────

const EXAMPLE_NAME = 'Customer Support RAG Agent'

const EXAMPLE_CONTEXT: FlowContext = {
  description:
    'Answers customer questions about orders, returns, and product details by retrieving relevant knowledge-base articles and synthesising a concise reply. Escalates to a human agent when confidence is low or the issue involves a refund over $200.',
  howItWorks:
    'User message → prompt template (injects conversation history from memory) → parallel branch:\n' +
    '  1. Embedding model converts query to vector → vector DB similarity search (top-5 chunks)\n' +
    '  2. Classifier checks intent (FAQ / order-lookup / escalation)\n' +
    'Retriever merges chunks → aggregator combines retrieved context + intent signal → GPT-4o generates draft reply → guardrail checks for PII and off-topic content → output parser formats the final response.\n\n' +
    'Loopback: if the guardrail blocks the response, the agent is re-prompted with an explicit constraint and retries up to 2 times before escalating.',
  documents: [
    {
      id: 'example-doc-1',
      name: 'Returns & Refunds Policy',
      content:
        'Standard return window: 30 days from delivery for unused items in original packaging.\n' +
        'Exceptions: perishables, digital downloads, and customised products are non-returnable.\n' +
        'Refunds over $200 require manager approval and are processed within 5–7 business days.\n' +
        'Exchanges can be initiated via the customer portal or by contacting support@example.com.',
    },
  ],
}


// ── Props ──────────────────────────────────────────────────────────────────────

interface FlowContextModalProps {
  open: boolean
  /** 'new' shows the clear/keep canvas toggle; 'edit' omits it */
  mode: 'new' | 'edit'
  initialName?: string
  initialContext?: FlowContext | null
  hasNodes?: boolean
  onSave: (name: string, context: FlowContext, clearCanvas: boolean) => void
  onClose: () => void
}

// ── Section header ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  const isDark = useFlowStore((s) => s.theme === 'dark')
  return (
    <p className={`text-[10px] font-semibold uppercase tracking-widest mb-2 ${isDark ? 'text-white/30' : 'text-slate-500'}`}>
      {children}
    </p>
  )
}

// ── Document card ──────────────────────────────────────────────────────────────

function DocCard({
  doc,
  onChange,
  onRemove,
}: {
  doc: FlowContextDocument
  onChange: (updated: FlowContextDocument) => void
  onRemove: () => void
}) {
  const isDark = useFlowStore((s) => s.theme === 'dark')
  const [expanded, setExpanded] = useState(true)

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',
        border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(99,102,241,0.16)',
      }}
    >
      {/* Card header */}
      <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(99,102,241,0.14)' }}>
        <FileText size={12} className={`shrink-0 ${isDark ? 'text-sky-400' : 'text-indigo-500'}`} />
        <input
          value={doc.name}
          onChange={(e) => onChange({ ...doc, name: e.target.value })}
          placeholder="Document name"
          className={`flex-1 bg-transparent text-[12px] font-medium focus:outline-none min-w-0 ${isDark ? 'text-white placeholder:text-white/25' : 'text-slate-800 placeholder:text-slate-400'}`}
        />
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={`p-0.5 transition-colors ${isDark ? 'text-white/30 hover:text-white/60' : 'text-slate-400 hover:text-slate-700'}`}
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        <button
          type="button"
          onClick={onRemove}
          className={`p-0.5 transition-colors ${isDark ? 'text-white/30 hover:text-red-400' : 'text-slate-400 hover:text-red-500'}`}
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Card body */}
      {expanded && (
        <textarea
          value={doc.content}
          onChange={(e) => onChange({ ...doc, content: e.target.value })}
          placeholder="Paste document content here…"
          spellCheck={false}
          rows={5}
          className={`
            w-full px-3 py-2.5 bg-transparent
            text-[11px] leading-relaxed font-mono
            focus:outline-none resize-none
            ${isDark ? 'text-white/70 placeholder:text-white/20' : 'text-slate-700 placeholder:text-slate-400'}
          `}
        />
      )}
    </div>
  )
}

// ── Main modal ─────────────────────────────────────────────────────────────────

export default function FlowContextModal({
  open,
  mode,
  initialName = 'Untitled Flow',
  initialContext,
  hasNodes = false,
  onSave,
  onClose,
}: FlowContextModalProps) {
  const theme = useFlowStore((s) => s.theme)
  const isDark = theme === 'dark'
  const storeNodes = useFlowStore((s) => s.nodes) as Node<BaseNodeData>[]
  const storeEdges = useFlowStore((s) => s.edges) as Edge[]
  const layoutDirection = useFlowStore((s) => s.layoutDirection)
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialContext?.description ?? '')
  const [howItWorks, setHowItWorks] = useState(initialContext?.howItWorks ?? '')
  const [documents, setDocuments] = useState<FlowContextDocument[]>(
    initialContext?.documents ?? [],
  )
  const [clearCanvas, setClearCanvas] = useState(false)
  const [synthLoading, setSynthLoading] = useState(false)
  const [synthError, setSynthError] = useState<string | null>(null)
  const [exportCopied, setExportCopied] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const buildMarkdownPack = useCallback(() => {
    const flowLabel = name.trim() || initialName.trim() || 'Untitled Flow'
    return generateCodingAgentMarkdownPack(
      flowLabel,
      storeNodes,
      storeEdges,
      { description, howItWorks, documents },
      layoutDirection,
    )
  }, [
    name,
    initialName,
    storeNodes,
    storeEdges,
    description,
    howItWorks,
    documents,
    layoutDirection,
  ])

  const handleCopyMarkdownPack = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(buildMarkdownPack())
      setExportCopied(true)
      setTimeout(() => setExportCopied(false), 2000)
    } catch {
      /* clipboard may be denied */
    }
  }, [buildMarkdownPack])

  const handleDownloadMarkdownPack = useCallback(() => {
    const flowLabel = name.trim() || initialName.trim() || 'Untitled Flow'
    const md = buildMarkdownPack()
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = codingAgentMarkdownFilename(flowLabel)
    a.click()
    URL.revokeObjectURL(url)
  }, [buildMarkdownPack, name, initialName])

  // Sync when initialContext changes (e.g. opening edit mode with existing data)
  useEffect(() => {
    if (open) {
      setName(initialName)
      setDescription(initialContext?.description ?? '')
      setHowItWorks(initialContext?.howItWorks ?? '')
      setDocuments(initialContext?.documents ?? [])
      setClearCanvas(false)
      setSynthError(null)
      setSynthLoading(false)
      setExportCopied(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleGenerateFromDiagram = useCallback(async () => {
    if (!hasNodes) return
    setSynthError(null)
    setSynthLoading(true)
    try {
      const flowLabel = name.trim() || initialName.trim() || 'Untitled Flow'
      const result = await synthesizeFlowContextFromDiagram(
        storeNodes,
        storeEdges,
        flowLabel,
        { description, howItWorks },
      )
      setDescription(result.description)
      setHowItWorks(result.howItWorks)
    } catch (e) {
      setSynthError(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setSynthLoading(false)
    }
  }, [hasNodes, storeNodes, storeEdges, name, initialName, description, howItWorks])

  const addDocument = useCallback(() => {
    setDocuments((prev) => [
      ...prev,
      { id: `doc-${Date.now()}`, name: '', content: '' },
    ])
  }, [])

  const updateDocument = useCallback((id: string, updated: FlowContextDocument) => {
    setDocuments((prev) => prev.map((d) => (d.id === id ? updated : d)))
  }, [])

  const removeDocument = useCallback((id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id))
  }, [])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const content = (ev.target?.result as string) ?? ''
        setDocuments((prev) => [
          ...prev,
          {
            id: `doc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            name: file.name.replace(/\.[^.]+$/, ''),
            content,
          },
        ])
      }
      reader.readAsText(file)
    })
    e.target.value = ''
  }, [])

  const handleFillExample = useCallback(() => {
    setName(EXAMPLE_NAME)
    setDescription(EXAMPLE_CONTEXT.description)
    setHowItWorks(EXAMPLE_CONTEXT.howItWorks)
    setDocuments(EXAMPLE_CONTEXT.documents.map((d) => ({ ...d, id: `doc-${Date.now()}-${d.id}` })))
  }, [])

  const handleClearDetails = useCallback(() => {
    setName('Untitled Flow')
    setDescription('')
    setHowItWorks('')
    setDocuments([])
  }, [])

  const handleSave = useCallback(() => {
    onSave(
      name.trim() || 'Untitled Flow',
      { description, howItWorks, documents },
      mode === 'new' ? clearCanvas : false,
    )
  }, [name, description, howItWorks, documents, clearCanvas, mode, onSave])

  const isNew = mode === 'new'

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none"
          >
            <div
              className="
                pointer-events-auto
                w-full max-w-2xl max-h-[88vh] flex flex-col
                rounded-2xl shadow-2xl
                overflow-hidden
              "
              style={{
                background: isDark ? '#030712' : '#f8faff',
                border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(99,102,241,0.2)',
              }}
            >
              {/* Header */}
              <div className="flex items-start justify-between px-5 py-4 shrink-0" style={{ borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(99,102,241,0.16)' }}>
                <div>
                  <h2 className={`text-[14px] font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {isNew ? 'Set up your flow' : 'Edit flow context'}
                  </h2>
                  <p className={`text-[11px] mt-0.5 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                    {isNew
                      ? 'Describe your agent for Design with AI and reviews. Export a Markdown pack for coding agents from this dialog (see below).'
                      : 'Used by Design with AI and design review. Export a Markdown pack for coding agents from this dialog (see below).'}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap justify-end">
                  {hasNodes && (
                    <button
                      type="button"
                      onClick={() => void handleGenerateFromDiagram()}
                      disabled={synthLoading}
                      title="Draft both fields from the current canvas (node descriptions, types, edges). Refines existing text if present."
                      className="
                        flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                        text-[11px] font-medium transition-colors disabled:opacity-45
                      "
                      style={isDark
                        ? { color: 'rgba(167,139,250,0.95)', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(167,139,250,0.35)' }
                        : { color: '#5b21b6', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(124,58,237,0.35)' }
                      }
                    >
                      {synthLoading ? <Loader2 size={11} className="animate-spin" /> : <Wand2 size={11} />}
                      Generate from diagram
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleClearDetails}
                    className="
                      flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                      text-[11px] font-medium
                      transition-colors
                    "
                    style={isDark
                      ? { color: 'rgba(255,255,255,0.65)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)' }
                      : { color: '#475569', background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(99,102,241,0.24)' }
                    }
                  >
                    <RotateCcw size={11} />
                    Clear details
                  </button>
                  <button
                    type="button"
                    onClick={handleFillExample}
                    className="
                      flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                      text-[11px] font-medium transition-colors
                    "
                    style={isDark
                      ? { color: 'rgba(252,211,77,0.9)', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }
                      : { color: '#92400e', background: 'rgba(251,191,36,0.16)', border: '1px solid rgba(251,191,36,0.34)' }
                    }
                  >
                    <Sparkles size={11} />
                    Fill with example
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-white/40 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto min-h-0 p-5 space-y-6">
                {synthError && (
                  <p className={`text-[11px] rounded-lg px-3 py-2 border ${isDark ? 'text-red-300 bg-red-950/50 border-red-900/50' : 'text-red-800 bg-red-50 border-red-200'}`}>
                    {synthError}
                  </p>
                )}
                {hasNodes && (
                  <p className={`text-[10px] leading-snug ${isDark ? 'text-white/35' : 'text-slate-500'}`}>
                    Tip: fill each node&rsquo;s Description on the canvas, then use Generate from diagram to draft this context for coding agents. Business documents below are unchanged unless you edit them.
                  </p>
                )}

                {/* ── Export for coding agents ── */}
                <div
                  className="rounded-xl px-3 py-3"
                  style={{
                    background: isDark ? 'rgba(139,92,246,0.08)' : 'rgba(79,70,229,0.06)',
                    border: isDark ? '1px solid rgba(167,139,250,0.22)' : '1px solid rgba(99,102,241,0.22)',
                  }}
                >
                  <SectionLabel>Export for coding agents</SectionLabel>
                  <p className={`text-[10px] leading-snug mb-2.5 ${isDark ? 'text-white/45' : 'text-slate-600'}`}>
                    Copies the fields above (even before Save) plus the current canvas: implementation brief, node ID table, and YAML. Empty canvas is ok; the brief will mostly be context-only.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleCopyMarkdownPack()}
                      className="
                        flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                        text-[11px] font-medium transition-colors
                      "
                      style={isDark
                        ? { color: 'rgba(226,232,240,0.9)', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }
                        : { color: '#334155', background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(99,102,241,0.28)' }
                      }
                    >
                      {exportCopied ? <Check size={11} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} /> : <Copy size={11} />}
                      {exportCopied ? 'Copied' : 'Copy Markdown pack'}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadMarkdownPack}
                      className="
                        flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                        text-[11px] font-medium transition-colors
                      "
                      style={isDark
                        ? { color: 'rgba(167,139,250,0.95)', background: 'rgba(139,92,246,0.14)', border: '1px solid rgba(167,139,250,0.35)' }
                        : { color: '#5b21b6', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(124,58,237,0.35)' }
                      }
                    >
                      <Download size={11} />
                      Download .md
                    </button>
                  </div>
                </div>

                {/* ── Flow Info ── */}
                <div>
                  <SectionLabel>Flow info</SectionLabel>
                  <div className="space-y-3">
                    <div>
                      <label className={`block text-[11px] mb-1 ${isDark ? 'text-white/50' : 'text-slate-600'}`}>Flow name</label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Customer Support Agent"
                        className={`
                          w-full px-3 py-2 rounded-lg text-[13px]
                          focus:outline-none
                          ${isDark
                            ? 'text-white bg-white/5 border border-white/10 placeholder:text-white/20 focus:border-sky-500/60'
                            : 'text-slate-900 bg-white border border-indigo-200/80 placeholder:text-slate-400 focus:border-indigo-500/60'}
                        `}
                      />
                    </div>
                    <div>
                      <label className={`block text-[11px] mb-1 ${isDark ? 'text-white/50' : 'text-slate-600'}`}>
                        What does this agent do?
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="e.g. Answers customer questions about orders and returns using a knowledge base and escalates complex cases to human agents."
                        rows={3}
                        className={`
                          w-full px-3 py-2.5 rounded-lg text-[12px] leading-relaxed
                          focus:outline-none resize-none
                          ${isDark
                            ? 'text-white/80 bg-white/5 border border-white/10 placeholder:text-white/20 focus:border-sky-500/60'
                            : 'text-slate-800 bg-white border border-indigo-200/80 placeholder:text-slate-400 focus:border-indigo-500/60'}
                        `}
                      />
                    </div>
                  </div>
                </div>

                {/* ── How it works ── */}
                <div>
                  <SectionLabel>How it works</SectionLabel>
                  <textarea
                    value={howItWorks}
                    onChange={(e) => setHowItWorks(e.target.value)}
                    placeholder={`Describe the architecture, data flow, key decisions, and edge cases.\n\ne.g. User query → classifier (routes to FAQ vs order lookup) → retriever pulls from vector DB → LLM synthesises answer → guardrail checks for PII before response.`}
                    rows={5}
                  className={`
                      w-full px-3 py-2.5 rounded-lg text-[12px] leading-relaxed
                      focus:outline-none resize-none
                      ${isDark
                        ? 'text-white/80 bg-white/5 border border-white/10 placeholder:text-white/20 focus:border-sky-500/60'
                        : 'text-slate-800 bg-white border border-indigo-200/80 placeholder:text-slate-400 focus:border-indigo-500/60'}
                    `}
                  />
                </div>

                {/* ── Business Documents ── */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <SectionLabel>Business documents</SectionLabel>
                    <div className="flex items-center gap-1.5 -mt-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="
                          flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium
                          transition-colors
                        "
                        style={isDark
                          ? { color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }
                          : { color: '#475569', border: '1px solid rgba(99,102,241,0.22)', background: 'rgba(255,255,255,0.92)' }
                        }
                      >
                        <Upload size={11} />
                        Upload
                      </button>
                      <button
                        type="button"
                        onClick={addDocument}
                        className="
                          flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium
                          transition-colors
                        "
                        style={isDark
                          ? { color: '#38bdf8', border: '1px solid rgba(3,105,161,0.45)' }
                          : { color: '#4338ca', border: '1px solid rgba(99,102,241,0.35)', background: 'rgba(79,70,229,0.08)' }
                        }
                      >
                        <Plus size={11} />
                        Add doc
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".txt,.md,.mdx"
                        multiple
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </div>
                  </div>

                  {documents.length === 0 ? (
                    <button
                      type="button"
                      onClick={addDocument}
                      className="w-full py-6 rounded-xl border border-dashed text-[12px] transition-colors"
                      style={isDark
                        ? { borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.3)' }
                        : { borderColor: 'rgba(99,102,241,0.28)', color: 'rgba(71,85,105,0.85)', background: 'rgba(255,255,255,0.76)' }
                      }
                    >
                      + Add business documents, policies, or SLA requirements
                    </button>
                  ) : (
                    <div className="space-y-2">
                      {documents.map((doc) => (
                        <DocCard
                          key={doc.id}
                          doc={doc}
                          onChange={(updated) => updateDocument(doc.id, updated)}
                          onRemove={() => removeDocument(doc.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center gap-3 px-5 py-4 shrink-0" style={{ borderTop: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(99,102,241,0.16)' }}>

                {/* Clear / keep toggle — new mode only, only relevant when nodes exist */}
                {isNew && hasNodes && (
                  <div className="flex items-center gap-3 flex-1">
                    {(['keep', 'clear'] as const).map((opt) => (
                      <label
                        key={opt}
                        className={`flex items-center gap-1.5 cursor-pointer text-[12px] transition-colors ${isDark ? 'text-white/50 hover:text-white/70' : 'text-slate-600 hover:text-slate-800'}`}
                      >
                        <input
                          type="radio"
                          name="canvasMode"
                          value={opt}
                          checked={clearCanvas === (opt === 'clear')}
                          onChange={() => setClearCanvas(opt === 'clear')}
                          className="accent-sky-500"
                        />
                        {opt === 'keep' ? 'Keep current canvas' : 'Start fresh'}
                      </label>
                    ))}
                  </div>
                )}

                {/* Spacer when toggle not shown */}
                {!(isNew && hasNodes) && <div className="flex-1" />}

                <button
                  type="button"
                  onClick={onClose}
                  className={`px-3 py-1.5 rounded-lg text-[12px] transition-colors ${isDark ? 'text-white/40 hover:text-white/70' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
                  style={isDark
                    ? { background: 'rgba(15,118,110,0.8)', border: '1px solid rgba(20,184,166,0.4)', color: '#fff' }
                    : { background: 'rgba(79,70,229,0.9)', border: '1px solid rgba(79,70,229,0.5)', color: '#fff' }
                  }
                >
                  {isNew ? 'Create flow' : 'Save changes'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
