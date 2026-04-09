import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Trash2, Upload, FileText, ChevronDown, ChevronUp, Sparkles, RotateCcw } from 'lucide-react'
import type { FlowContext, FlowContextDocument } from '../../types/flow'

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
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-2">
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
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
      {/* Card header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/8">
        <FileText size={12} className="text-sky-400 shrink-0" />
        <input
          value={doc.name}
          onChange={(e) => onChange({ ...doc, name: e.target.value })}
          placeholder="Document name"
          className="
            flex-1 bg-transparent text-[12px] font-medium text-white
            placeholder:text-white/25 focus:outline-none min-w-0
          "
        />
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="p-0.5 text-white/30 hover:text-white/60 transition-colors"
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="p-0.5 text-white/30 hover:text-red-400 transition-colors"
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
          className="
            w-full px-3 py-2.5 bg-transparent
            text-[11px] text-white/70 leading-relaxed font-mono
            placeholder:text-white/20
            focus:outline-none resize-none
          "
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
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialContext?.description ?? '')
  const [howItWorks, setHowItWorks] = useState(initialContext?.howItWorks ?? '')
  const [documents, setDocuments] = useState<FlowContextDocument[]>(
    initialContext?.documents ?? [],
  )
  const [clearCanvas, setClearCanvas] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sync when initialContext changes (e.g. opening edit mode with existing data)
  useEffect(() => {
    if (open) {
      setName(initialName)
      setDescription(initialContext?.description ?? '')
      setHowItWorks(initialContext?.howItWorks ?? '')
      setDocuments(initialContext?.documents ?? [])
      setClearCanvas(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

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
                bg-gray-950 border border-white/10 rounded-2xl shadow-2xl
                overflow-hidden
              "
            >
              {/* Header */}
              <div className="flex items-start justify-between px-5 py-4 border-b border-white/8 shrink-0">
                <div>
                  <h2 className="text-[14px] font-semibold text-white">
                    {isNew ? 'Set up your flow' : 'Edit flow context'}
                  </h2>
                  <p className="text-[11px] text-white/40 mt-0.5">
                    {isNew
                      ? 'Describe your agent so AI can give targeted suggestions'
                      : 'Update context to improve AI evaluation suggestions'}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <button
                    type="button"
                    onClick={handleClearDetails}
                    className="
                      flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                      text-[11px] font-medium text-white/65
                      bg-white/5 hover:bg-white/10 border border-white/15
                      transition-colors
                    "
                  >
                    <RotateCcw size={11} />
                    Clear details
                  </button>
                  <button
                    type="button"
                    onClick={handleFillExample}
                    className="
                      flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                      text-[11px] font-medium text-amber-300/80
                      bg-amber-400/8 hover:bg-amber-400/15 border border-amber-400/20
                      transition-colors
                    "
                  >
                    <Sparkles size={11} />
                    Fill with example
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto min-h-0 p-5 space-y-6">

                {/* ── Flow Info ── */}
                <div>
                  <SectionLabel>Flow info</SectionLabel>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] text-white/50 mb-1">Flow name</label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Customer Support Agent"
                        className="
                          w-full px-3 py-2 rounded-lg text-[13px] text-white
                          bg-white/5 border border-white/10
                          placeholder:text-white/20
                          focus:outline-none focus:border-sky-500/60
                        "
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-white/50 mb-1">
                        What does this agent do?
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="e.g. Answers customer questions about orders and returns using a knowledge base and escalates complex cases to human agents."
                        rows={3}
                        className="
                          w-full px-3 py-2.5 rounded-lg text-[12px] text-white/80
                          bg-white/5 border border-white/10 leading-relaxed
                          placeholder:text-white/20
                          focus:outline-none focus:border-sky-500/60
                          resize-none
                        "
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
                    className="
                      w-full px-3 py-2.5 rounded-lg text-[12px] text-white/80
                      bg-white/5 border border-white/10 leading-relaxed
                      placeholder:text-white/20
                      focus:outline-none focus:border-sky-500/60
                      resize-none
                    "
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
                          text-white/40 hover:text-white/70 hover:bg-white/5
                          border border-white/10 transition-colors
                        "
                      >
                        <Upload size={11} />
                        Upload
                      </button>
                      <button
                        type="button"
                        onClick={addDocument}
                        className="
                          flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium
                          text-sky-400 hover:text-sky-300 hover:bg-sky-900/20
                          border border-sky-700/30 transition-colors
                        "
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
                      className="
                        w-full py-6 rounded-xl
                        border border-dashed border-white/15
                        text-[12px] text-white/30
                        hover:border-white/25 hover:text-white/50
                        transition-colors
                      "
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
              <div className="flex items-center gap-3 px-5 py-4 border-t border-white/8 shrink-0">

                {/* Clear / keep toggle — new mode only, only relevant when nodes exist */}
                {isNew && hasNodes && (
                  <div className="flex items-center gap-3 flex-1">
                    {(['keep', 'clear'] as const).map((opt) => (
                      <label
                        key={opt}
                        className="flex items-center gap-1.5 cursor-pointer text-[12px] text-white/50 hover:text-white/70 transition-colors"
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
                  className="px-3 py-1.5 rounded-lg text-[12px] text-white/40 hover:text-white/70 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="
                    px-4 py-1.5 rounded-lg text-[13px] font-medium
                    bg-teal-700/80 border border-teal-500/40 text-white
                    hover:bg-teal-600/90 transition-colors
                  "
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
