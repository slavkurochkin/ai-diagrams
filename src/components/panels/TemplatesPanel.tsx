import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Upload, FileCode, ChevronRight, AlertCircle } from 'lucide-react'
import { FLOW_TEMPLATES, CATEGORY_LABELS } from '../../lib/templates'
import type { FlowTemplate } from '../../lib/templates'
import { parseFlowYAML } from '../../lib/yamlFlow'
import { applyAutoLayout } from '../../lib/autoLayout'
import { useFlowStore } from '../../hooks/useFlowStore'
import type { Node } from 'reactflow'
import type { BaseNodeData } from '../../types/nodes'

const DEFAULT_NODE_WIDTH = 220
const DEFAULT_NODE_HEIGHT = 110
const FRAME_PADDING_X = 64
const FRAME_PADDING_Y = 72

function getNodeSize(node: Node<BaseNodeData>): { width: number; height: number } {
  const widthFromNode = typeof node.width === 'number' ? node.width : undefined
  const heightFromNode = typeof node.height === 'number' ? node.height : undefined
  const widthFromStyle = typeof node.style?.width === 'number' ? node.style.width : undefined
  const heightFromStyle = typeof node.style?.height === 'number' ? node.style.height : undefined
  const widthFromConfig = typeof node.data?.config?.width === 'number' ? node.data.config.width : undefined
  const heightFromConfig = typeof node.data?.config?.height === 'number' ? node.data.config.height : undefined
  return {
    width: widthFromNode ?? widthFromStyle ?? widthFromConfig ?? DEFAULT_NODE_WIDTH,
    height: heightFromNode ?? heightFromStyle ?? heightFromConfig ?? DEFAULT_NODE_HEIGHT,
  }
}

function withDefaultTemplateFrame(
  nodes: Node<BaseNodeData>[],
  templateName: string,
): Node<BaseNodeData>[] {
  if (nodes.length === 0) return nodes
  if (nodes.some((n) => n.type === 'frame')) return nodes

  const contentNodes = nodes.filter((n) => n.type !== 'text')
  const source = contentNodes.length > 0 ? contentNodes : nodes

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const node of source) {
    const { width, height } = getNodeSize(node)
    minX = Math.min(minX, node.position.x)
    minY = Math.min(minY, node.position.y)
    maxX = Math.max(maxX, node.position.x + width)
    maxY = Math.max(maxY, node.position.y + height)
  }

  const frameNode: Node<BaseNodeData> = {
    id: `template-frame-${Date.now()}`,
    type: 'frame',
    zIndex: -1,
    position: {
      x: Math.round(minX - FRAME_PADDING_X),
      y: Math.round(minY - FRAME_PADDING_Y),
    },
    style: {
      width: Math.round(Math.max(220, (maxX - minX) + FRAME_PADDING_X * 2)),
      height: Math.round(Math.max(180, (maxY - minY) + FRAME_PADDING_Y * 2)),
    },
    data: {
      nodeType: 'frame',
      label: 'Frame',
      animationState: 'idle',
      accentColor: '#2664e8',
      config: {
        title: templateName,
        width: Math.round(Math.max(220, (maxX - minX) + FRAME_PADDING_X * 2)),
        height: Math.round(Math.max(180, (maxY - minY) + FRAME_PADDING_Y * 2)),
        groupGlow: false,
      },
    },
  }

  return [...nodes, frameNode]
}

// ── Category badge ─────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  rag: 'bg-cyan-900/60 text-cyan-300 border-cyan-700/40',
  agent: 'bg-rose-900/60 text-rose-300 border-rose-700/40',
  eval: 'bg-sky-900/60 text-sky-300 border-sky-700/40',
  pipeline: 'bg-emerald-900/60 text-emerald-300 border-emerald-700/40',
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface TemplatesPanelProps {
  open: boolean
  onClose: () => void
}

// ── Template card ──────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  onLoad,
}: {
  template: FlowTemplate
  onLoad: (t: FlowTemplate) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onLoad(template)}
      className="
        group text-left w-full p-4 rounded-xl
        bg-white/5 border border-white/10
        hover:bg-white/8 hover:border-white/20
        transition-all duration-150
        flex flex-col gap-2
      "
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] font-semibold text-white leading-tight">
          {template.name}
        </span>
        <span
          className={`
            shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium border
            ${CATEGORY_COLORS[template.category] ?? CATEGORY_COLORS.pipeline}
          `}
        >
          {CATEGORY_LABELS[template.category]}
        </span>
      </div>
      <p className="text-[11px] text-white/50 leading-relaxed">
        {template.description}
      </p>
      <div className="flex items-center gap-1 text-[11px] text-sky-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
        Load template
        <ChevronRight size={11} />
      </div>
    </button>
  )
}

// ── Main panel ─────────────────────────────────────────────────────────────────

export default function TemplatesPanel({ open, onClose }: TemplatesPanelProps) {
  const { nodes, setNodes, setEdges, setFlowName, layoutDirection, setLayoutDirection } = useFlowStore()

  const [tab, setTab] = useState<'templates' | 'import'>('templates')
  const [yamlText, setYamlText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadParsedFlow = useCallback(
    (yaml: string, name?: string, preferredLayoutDirection?: 'TB' | 'LR') => {
      setError(null)
      const result = parseFlowYAML(yaml)
      if ('error' in result) {
        setError(result.error)
        return false
      }

      if (nodes.length > 0) {
        const ok = window.confirm(
          'Loading a template will replace your current flow. Continue?',
        )
        if (!ok) return false
      }

      const nextLayoutDirection = preferredLayoutDirection ?? layoutDirection
      if (preferredLayoutDirection && preferredLayoutDirection !== layoutDirection) {
        setLayoutDirection(preferredLayoutDirection)
      }

      const finalNodes = result.hasExplicitPositions
        ? result.nodes
        : applyAutoLayout(result.nodes, result.edges, nextLayoutDirection)

      const nodesWithFrame = withDefaultTemplateFrame(
        finalNodes as Node<BaseNodeData>[],
        name ?? result.name,
      )

      setNodes(nodesWithFrame)
      setEdges(result.edges)
      setFlowName(name ?? result.name)
      onClose()
      return true
    },
    [nodes, setNodes, setEdges, setFlowName, layoutDirection, setLayoutDirection, onClose],
  )

  const handleLoadTemplate = useCallback(
    (template: FlowTemplate) => {
      loadParsedFlow(template.yaml, template.name, template.preferredLayoutDirection)
    },
    [loadParsedFlow],
  )

  const handleImportYAML = useCallback(() => {
    loadParsedFlow(yamlText)
  }, [yamlText, loadParsedFlow])

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        setYamlText(ev.target?.result as string ?? '')
        setTab('import')
      }
      reader.readAsText(file)
      e.target.value = ''
    },
    [],
  )

  const categories = ['all', ...Array.from(new Set(FLOW_TEMPLATES.map((t) => t.category)))]
  const visibleTemplates =
    selectedCategory === 'all'
      ? FLOW_TEMPLATES
      : FLOW_TEMPLATES.filter((t) => t.category === selectedCategory)

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

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="
              fixed inset-0 z-50 flex items-center justify-center p-6
              pointer-events-none
            "
          >
            <div
              className="
                pointer-events-auto
                w-full max-w-2xl max-h-[80vh] flex flex-col
                bg-gray-950 border border-white/10 rounded-2xl shadow-2xl
                overflow-hidden
              "
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
                <div>
                  <h2 className="text-[14px] font-semibold text-white">Templates & Import</h2>
                  <p className="text-[11px] text-white/40 mt-0.5">
                    Load a starter flow or import your own YAML
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Tab bar */}
              <div className="flex gap-1 px-5 pt-3 border-b border-white/8">
                {(['templates', 'import'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`
                      px-3 py-1.5 rounded-t text-[12px] font-medium capitalize transition-colors
                      ${tab === t
                        ? 'text-white border-b-2 border-sky-500 -mb-px'
                        : 'text-white/40 hover:text-white/70'
                      }
                    `}
                  >
                    {t === 'templates' ? 'Templates' : 'Import YAML'}
                  </button>
                ))}
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto min-h-0 p-5">

                {/* ── Templates tab ── */}
                {tab === 'templates' && (
                  <div className="flex flex-col gap-4">
                    {/* Category filter */}
                    <div className="flex gap-1.5 flex-wrap">
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategory(cat)}
                          className={`
                            px-2.5 py-1 rounded-full text-[11px] font-medium capitalize
                            border transition-colors
                            ${selectedCategory === cat
                              ? 'bg-teal-700/80 border-teal-500/40 text-white'
                              : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80'
                            }
                          `}
                        >
                          {cat === 'all' ? 'All' : CATEGORY_LABELS[cat as FlowTemplate['category']]}
                        </button>
                      ))}
                    </div>

                    {/* Cards grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {visibleTemplates.map((t) => (
                        <TemplateCard key={t.id} template={t} onLoad={handleLoadTemplate} />
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Import YAML tab ── */}
                {tab === 'import' && (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[12px] text-white/50">
                        Paste a flow YAML or upload a <code className="text-sky-400">.yaml</code> file.
                      </p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="
                          flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium
                          bg-white/5 border border-white/10 text-white/60
                          hover:bg-white/10 hover:text-white transition-colors
                        "
                      >
                        <Upload size={12} />
                        Upload file
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".yaml,.yml"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </div>

                    <textarea
                      value={yamlText}
                      onChange={(e) => { setYamlText(e.target.value); setError(null) }}
                      placeholder={`name: My Flow\nnodes:\n  - id: llm\n    type: llm\n  - id: section\n    type: frame\n    config:\n      title: Retrieval\n      width: 420\n      height: 260\n  - id: note\n    type: text\n    config:\n      content: "Explain what happens here"\n      width: 320\n      height: 160\n  - id: parser\n    type: outputParser\nedges:\n  - from: llm\n    to: parser\n    fromHandle: response\n    toHandle: text`}
                      spellCheck={false}
                      className="
                        w-full h-64 p-3 rounded-xl font-mono text-[11px] leading-relaxed
                        bg-white/5 border border-white/10 text-white/80
                        placeholder:text-white/20
                        focus:outline-none focus:border-sky-500/60
                        resize-none
                      "
                    />

                    {error && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-red-900/30 border border-red-700/40 text-red-300 text-[11px]">
                        <AlertCircle size={13} className="shrink-0 mt-0.5" />
                        {error}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleImportYAML}
                      disabled={!yamlText.trim()}
                      className="
                        flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                        text-[13px] font-medium
                        bg-teal-700/80 border border-teal-500/40 text-white
                        hover:bg-teal-600/90 transition-colors
                        disabled:opacity-40 disabled:pointer-events-none
                      "
                    >
                      <FileCode size={14} />
                      Load Flow from YAML
                    </button>

                    {/* Schema reference */}
                    <details className="text-[11px] text-white/40">
                      <summary className="cursor-pointer hover:text-white/60 transition-colors">
                        YAML schema reference
                      </summary>
                      <pre className="mt-2 p-3 rounded-lg bg-white/5 text-white/60 leading-relaxed overflow-x-auto">{`name: "My Flow"          # flow title
nodes:
  - id: myNode           # short id (used in edges)
    type: llm            # node type (see sidebar); use "frame" or "text" for annotations
    label: "My LLM"      # optional label override
    config:              # optional config overrides
      model: gpt-4o
    note: "Markdown note"
    position:            # optional explicit canvas position
      x: 320
      y: 160
  - id: retrievalBand
    type: frame
    config:
      title: "Retrieval"
      width: 420
      height: 260
    position:
      x: 120
      y: 80
  - id: explainer
    type: text
    config:
      content: "## Retrieval notes\n\n- fetch top-k chunks\n- optional reranking before generation"
      width: 320
      height: 150
    position:
      x: 580
      y: 120
edges:
  - from: myNode         # source node id
    to: otherNode        # target node id
    fromHandle: response # optional handle id
    toHandle: prompt     # optional handle id
    kind: loopback       # optional edge styling hint
    lane: top            # optional loop lane: top/bottom/left/right`}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
