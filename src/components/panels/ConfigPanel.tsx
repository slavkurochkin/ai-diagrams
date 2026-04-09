import { useCallback, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trash2, StickyNote, BarChart2 } from 'lucide-react'
import { useFlowStore } from '../../hooks/useFlowStore'
import { getNodeDefinition } from '../../lib/nodeDefinitions'
import type { NotePlacement } from '../../types/nodes'
import type { ConfigField } from '../../types/nodes'
import RAGEvalPanel from './RAGEvalPanel'

const EDGE_SPEED_PRESETS = [0.25, 0.5, 1, 2] as const
const EDGE_THICKNESS_PRESETS = [0.75, 1, 1.5, 2, 3] as const
const DEFAULT_FRAME_WIDTH = 420
const DEFAULT_FRAME_HEIGHT = 260

// ── Individual field renderers ─────────────────────────────────────────────────

interface FieldProps {
  field: ConfigField
  value: string | number | boolean
  onChange: (val: string | number | boolean) => void
}

function TextField({ field, value, onChange }: FieldProps) {
  return (
    <input
      type="text"
      value={String(value)}
      placeholder={field.placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="
        w-full px-2.5 py-1.5 rounded-md text-[12px]
        bg-white/5 border border-white/10
        text-white/80 placeholder-white/25
        focus:outline-none focus:border-white/30 focus:bg-white/10
        transition-colors duration-150
      "
    />
  )
}

function TextareaField({ field, value, onChange }: FieldProps) {
  return (
    <textarea
      value={String(value)}
      placeholder={field.placeholder}
      rows={4}
      onChange={(e) => onChange(e.target.value)}
      className="
        w-full px-2.5 py-1.5 rounded-md text-[12px] resize-none
        bg-white/5 border border-white/10
        text-white/80 placeholder-white/25
        focus:outline-none focus:border-white/30 focus:bg-white/10
        transition-colors duration-150 font-mono leading-relaxed
      "
    />
  )
}

function NumberField({ field, value, onChange }: FieldProps) {
  return (
    <input
      type="number"
      value={Number(value)}
      min={field.min}
      max={field.max}
      step={field.step}
      onChange={(e) => onChange(Number(e.target.value))}
      className="
        w-full px-2.5 py-1.5 rounded-md text-[12px]
        bg-white/5 border border-white/10
        text-white/80
        focus:outline-none focus:border-white/30 focus:bg-white/10
        transition-colors duration-150
      "
    />
  )
}

function SelectField({ field, value, onChange }: FieldProps) {
  return (
    <select
      value={String(value)}
      onChange={(e) => onChange(e.target.value)}
      className="
        w-full px-2.5 py-1.5 rounded-md text-[12px]
        bg-gray-800 border border-white/10
        text-white/80
        focus:outline-none focus:border-white/30
        transition-colors duration-150 cursor-pointer
      "
    >
      {field.options?.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

function SliderField({ field, value, onChange }: FieldProps) {
  const num = Number(value)
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        value={num}
        min={field.min}
        max={field.max}
        step={field.step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-sky-500 cursor-pointer"
      />
      <span className="text-[11px] font-mono text-white/60 w-10 text-right shrink-0">
        {num}
      </span>
    </div>
  )
}

function ColorField({ value, onChange }: FieldProps) {
  const hex = typeof value === 'string' ? value : '#888888'
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={hex}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-10 rounded border border-white/10 bg-transparent cursor-pointer"
      />
      <input
        type="text"
        value={hex}
        onChange={(e) => onChange(e.target.value)}
        className="
          flex-1 px-2.5 py-1.5 rounded-md text-[12px] font-mono
          bg-white/5 border border-white/10
          text-white/80 placeholder-white/25
          focus:outline-none focus:border-white/30 focus:bg-white/10
          transition-colors duration-150
        "
      />
    </div>
  )
}

function BooleanField({ value, onChange }: FieldProps) {
  const on = Boolean(value)
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`
        relative inline-flex h-5 w-9 items-center rounded-full
        transition-colors duration-200 focus:outline-none
        ${on ? 'bg-sky-600' : 'bg-white/15'}
      `}
    >
      <span
        className={`
          inline-block h-3.5 w-3.5 rounded-full bg-white
          shadow transition-transform duration-200
          ${on ? 'translate-x-4' : 'translate-x-0.5'}
        `}
      />
    </button>
  )
}

function FieldRenderer(props: FieldProps) {
  switch (props.field.type) {
    case 'text':     return <TextField {...props} />
    case 'textarea': return <TextareaField {...props} />
    case 'number':   return <NumberField {...props} />
    case 'select':   return <SelectField {...props} />
    case 'slider':   return <SliderField {...props} />
    case 'boolean':  return <BooleanField {...props} />
    case 'color':    return <ColorField {...props} />
  }
}

// ── Config field row ───────────────────────────────────────────────────────────

function FieldRow({ field, value, onChange }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-[11px] font-medium text-white/60 uppercase tracking-wide">
          {field.label}
        </label>
        {field.type === 'boolean' && (
          <BooleanField field={field} value={value} onChange={onChange} />
        )}
      </div>
      {field.type !== 'boolean' && (
        <FieldRenderer field={field} value={value} onChange={onChange} />
      )}
      {field.description && (
        <p className="text-[10px] text-white/30 leading-relaxed">
          {field.description}
        </p>
      )}
    </div>
  )
}

// ── Config Panel ───────────────────────────────────────────────────────────────

export default function ConfigPanel() {
  const { selectedNodeId, selectedEdgeId, nodes, edges, globalPathColor, updateNodeConfig, updateNodeLabel, updateEdgePriority, updateEdgeTravelSpeed, updateEdgeThickness, updateEdgeColor, updateNodeNote, updateNodeAccentColor, toggleNodeNoteVisible, updateNodeNotePlacement, bringFrameToFront, sendFrameToBack, removeNode, setSelectedNode, setSelectedEdge } =
    useFlowStore()

  const selectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId)
    : null
  const selectedEdge = selectedEdgeId
    ? edges.find((e) => e.id === selectedEdgeId)
    : null

  const def = selectedNode ? getNodeDefinition(selectedNode.data.nodeType) : null
  const isFrameNode = selectedNode?.data.nodeType === 'frame'
  const isTextNode = selectedNode?.data.nodeType === 'text'
  const accentColor = selectedNode?.data.accentColor ?? def?.accentColor ?? '#2563EB'
  const outgoingEdges = selectedNode
    ? edges.filter((e) => e.source === selectedNode.id)
    : []
  const frameNodes = useMemo(() => {
    return nodes
      .filter((n) => n.type === 'frame')
      .map((n) => {
        const titleRaw = n.data?.config?.title
        const title = typeof titleRaw === 'string' && titleRaw.trim().length > 0 ? titleRaw.trim() : n.data.label
        const widthRaw = n.data?.config?.width
        const width = typeof widthRaw === 'number' ? widthRaw : DEFAULT_FRAME_WIDTH
        const heightRaw = n.data?.config?.height
        const height = typeof heightRaw === 'number' ? heightRaw : DEFAULT_FRAME_HEIGHT
        return { id: n.id, title, area: width * height }
      })
      .sort((a, b) => a.area - b.area)
  }, [nodes])

  const handleChange = useCallback(
    (key: string, value: string | number | boolean) => {
      if (!selectedNodeId) return
      updateNodeConfig(selectedNodeId, { [key]: value })
    },
    [selectedNodeId, updateNodeConfig],
  )

  const handleDelete = useCallback(() => {
    if (!selectedNodeId) return
    removeNode(selectedNodeId)
    setSelectedNode(null)
  }, [selectedNodeId, removeNode, setSelectedNode])

  const [ragEvalOpen, setRagEvalOpen] = useState(false)

  return (
    <AnimatePresence>
      {selectedNode && def && (
        <motion.aside
          key="config-panel"
          initial={{ x: 280, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 280, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          className="
            w-72 h-full flex flex-col shrink-0
            bg-gray-950/90 border-l border-white/5
            backdrop-blur-sm overflow-hidden
          "
        >
          {/* ── Header ──────────────────────────────────────────────────── */}
          <div
            className="flex items-center gap-2 px-4 py-3 border-b border-white/5"
            style={{
              background: `linear-gradient(135deg, ${accentColor}20 0%, transparent 100%)`,
            }}
          >
            {/* Icon */}
            <div className="shrink-0" style={{ color: accentColor }}>
              <def.icon size={16} />
            </div>

            {/* Node label */}
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={selectedNode.data.label}
                onChange={(e) => updateNodeLabel(selectedNode.id, e.target.value)}
                className="
                  w-full text-[13px] font-semibold text-white/90 bg-transparent
                  border-b border-transparent hover:border-white/20 focus:border-white/40
                  focus:outline-none transition-colors duration-150 truncate
                "
              />
              <p className="text-[10px] text-white/45 mt-0.5 leading-snug">
                {def.description}
              </p>
            </div>

            {/* Delete */}
            <button
              type="button"
              onClick={handleDelete}
              title="Delete node"
              className="
                shrink-0 p-1.5 rounded-md text-white/30
                hover:text-red-400 hover:bg-red-500/10
                transition-colors duration-150
              "
            >
              <Trash2 size={13} />
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={() => setSelectedNode(null)}
              title="Close panel"
              className="
                shrink-0 p-1.5 rounded-md text-white/30
                hover:text-white/70 hover:bg-white/10
                transition-colors duration-150
              "
            >
              <X size={13} />
            </button>
          </div>

          {/* ── Scrollable fields ────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto sidebar-scroll px-4 py-4 space-y-5">
            {def.configFields
              .filter((field) => {
                if (!field.visibleWhen) return true
                return selectedNode.data.config[field.visibleWhen.key] === field.visibleWhen.value
              })
              .map((field) => (
                <FieldRow
                  key={field.key}
                  field={field}
                  value={selectedNode.data.config[field.key] ?? field.defaultValue}
                  onChange={(val) => handleChange(field.key, val)}
                />
              ))}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[11px] font-medium text-white/60 uppercase tracking-wide">
                  {isFrameNode ? 'Frame Color' : isTextNode ? 'Text Color' : 'Card Color'}
                </label>
                <button
                  type="button"
                  onClick={() => updateNodeAccentColor(selectedNode.id, undefined)}
                  className="text-[10px] text-white/35 hover:text-white/65 transition-colors"
                >
                  Use default
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => updateNodeAccentColor(selectedNode.id, e.target.value)}
                  className="h-9 w-12 rounded border border-white/10 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={selectedNode.data.accentColor ?? ''}
                  placeholder={def.accentColor}
                  onChange={(e) => updateNodeAccentColor(selectedNode.id, e.target.value || undefined)}
                  className="
                    flex-1 px-2.5 py-1.5 rounded-md text-[12px] font-mono
                    bg-white/5 border border-white/10
                    text-white/80 placeholder-white/25
                    focus:outline-none focus:border-white/30 focus:bg-white/10
                    transition-colors duration-150
                  "
                />
              </div>
              <p className="text-[10px] text-white/30 leading-relaxed">
                {isFrameNode
                  ? 'Override this frame’s tint without changing the default color for all frame nodes.'
                  : isTextNode
                  ? 'Override this text annotation color without changing the default color for all text nodes.'
                  : 'Override this node’s accent color without changing the default color for the whole component type.'}
              </p>
            </div>

            {isFrameNode && frameNodes.length > 1 && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-white/60 uppercase tracking-wide">
                  Frame Layer
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => bringFrameToFront(selectedNode.id)}
                    className="
                      px-2 py-1 rounded-md text-[11px] font-medium
                      bg-cyan-800/40 border border-cyan-400/45 text-cyan-200
                      hover:bg-cyan-700/45 transition-colors
                    "
                  >
                    Bring to front
                  </button>
                  <button
                    type="button"
                    onClick={() => sendFrameToBack(selectedNode.id)}
                    className="
                      px-2 py-1 rounded-md text-[11px] font-medium
                      bg-white/5 border border-white/10 text-white/70
                      hover:bg-white/10 hover:text-white transition-colors
                    "
                  >
                    Send to back
                  </button>
                </div>
                <p className="text-[10px] text-white/30 leading-relaxed">
                  Frames stay behind regular nodes, but you can reorder them to avoid blur from overlaps.
                </p>

                <label className="text-[11px] font-medium text-white/60 uppercase tracking-wide">
                  Select Another Frame
                </label>
                <div className="space-y-1.5">
                  {frameNodes.map((frame) => {
                    const active = frame.id === selectedNode.id
                    return (
                      <button
                        key={frame.id}
                        type="button"
                        onClick={() => setSelectedNode(frame.id)}
                        className={`
                          w-full text-left px-2.5 py-1.5 rounded-md text-[11px]
                          border transition-colors
                          ${active
                            ? 'bg-cyan-900/35 border-cyan-500/45 text-cyan-200'
                            : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'}
                        `}
                      >
                        {frame.title}
                      </button>
                    )
                  })}
                </div>
                <p className="text-[10px] text-white/30 leading-relaxed">
                  Frames are ordered from smaller to larger so nested groups are easier to pick.
                </p>
              </div>
            )}

            {/* ── Path priorities ───────────────────────────────────────── */}
            {!isFrameNode && !isTextNode && outgoingEdges.length > 0 && (
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-white/60 uppercase tracking-wide">
                  Path Priorities
                </label>
                <div className="space-y-2">
                  {outgoingEdges.map((edge, idx) => {
                    const targetNode = nodes.find((n) => n.id === edge.target)
                    const sourceLabel = edge.sourceHandle || `path ${idx + 1}`
                    const targetLabel = targetNode?.data.label ?? edge.target
                    const priorityRaw = (edge.data as { executionPriority?: unknown } | undefined)?.executionPriority
                    const priority =
                      typeof priorityRaw === 'number' && Number.isFinite(priorityRaw)
                        ? Math.max(1, Math.floor(priorityRaw))
                        : 1

                    return (
                      <div key={edge.id} className="flex items-center gap-2">
                        <div className="flex-1 min-w-0 text-[11px] text-white/65 truncate">
                          {sourceLabel} → {targetLabel}
                        </div>
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={priority}
                          onChange={(e) => updateEdgePriority(edge.id, Number(e.target.value))}
                          className="
                            w-16 px-2 py-1 rounded-md text-[11px] text-right
                            bg-white/5 border border-white/10 text-white/85
                            focus:outline-none focus:border-white/30 focus:bg-white/10
                            transition-colors duration-150
                          "
                        />
                      </div>
                    )
                  })}
                </div>
                <p className="text-[10px] text-white/30 leading-relaxed">
                  Same number runs in parallel. Lower numbers run first (1 → 2 → 3).
                </p>
              </div>
            )}

            {/* ── Note (markdown) ──────────────────────────────────────── */}
            {!isFrameNode && !isTextNode && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <StickyNote size={11} className="text-white/30" />
                <label className="text-[11px] font-medium text-white/60 uppercase tracking-wide">
                  Note
                </label>
                <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-[10px] text-white/25">
                  {selectedNode.data.noteAlwaysVisible ? 'always visible' : 'playback only'}
                </span>
                <button
                  type="button"
                  onClick={() => toggleNodeNoteVisible(selectedNode.id)}
                  className={`
                    relative inline-flex h-4 w-7 items-center rounded-full
                    transition-colors duration-200 focus:outline-none shrink-0
                    ${selectedNode.data.noteAlwaysVisible ? 'bg-sky-600' : 'bg-white/15'}
                  `}
                >
                  <span
                    className={`
                      inline-block h-3 w-3 rounded-full bg-white shadow
                      transition-transform duration-200
                      ${selectedNode.data.noteAlwaysVisible ? 'translate-x-3.5' : 'translate-x-0.5'}
                    `}
                  />
                </button>
              </div>
              </div>
              <textarea
                value={selectedNode.data.note ?? ''}
                placeholder={'Add a **markdown** note...\n\n- Bullet points work\n- So does **bold**'}
                rows={5}
                onChange={(e) => updateNodeNote(selectedNode.id, e.target.value)}
                className="
                  w-full px-2.5 py-1.5 rounded-md text-[12px] resize-none
                  bg-white/5 border border-white/10
                  text-white/80 placeholder-white/20
                  focus:outline-none focus:border-white/30 focus:bg-white/10
                  transition-colors duration-150 font-mono leading-relaxed
                "
              />
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-white/60 uppercase tracking-wide">
                  Note Placement
                </label>
                <select
                  value={selectedNode.data.notePlacement ?? 'auto'}
                  onChange={(e) => updateNodeNotePlacement(selectedNode.id, e.target.value as NotePlacement)}
                  className="
                    w-full px-2.5 py-1.5 rounded-md text-[12px]
                    bg-gray-800 border border-white/10
                    text-white/80
                    focus:outline-none focus:border-white/30
                    transition-colors duration-150 cursor-pointer
                  "
                >
                  <option value="auto">Auto (current default)</option>
                  <option value="right">Right</option>
                  <option value="bottom">Bottom</option>
                </select>
                <p className="text-[10px] text-white/30 leading-relaxed">
                  Auto keeps the existing behavior. Override it only when a note reads better on one side.
                </p>
              </div>
            </div>
            )}
          </div>

          {/* ── RAG Eval Visualizer button ───────────────────────────────── */}
          {selectedNode.data.nodeType === 'ragEvaluator' && (
            <div className="px-4 pb-3">
              <button
                type="button"
                onClick={() => setRagEvalOpen(true)}
                className="
                  w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg
                  text-[12px] font-medium
                  bg-cyan-900/40 border border-cyan-700/40 text-cyan-300
                  hover:bg-cyan-800/50 hover:text-white transition-colors
                "
              >
                <BarChart2 size={13} />
                Visualize Precision / Recall
              </button>
            </div>
          )}

          {/* ── Port reference ────────────────────────────────────────────── */}
          {(def.inputs.length > 0 || def.outputs.length > 0) && (
            <div className="px-4 py-3 border-t border-white/5 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25">
                Ports
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {def.inputs.map((p) => (
                  <div key={p.id} className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-slate-400" />
                    <span className="text-[10px] text-white/40 truncate">{p.label}</span>
                  </div>
                ))}
                {def.outputs.map((p) => (
                  <div key={p.id} className="flex items-center gap-1.5 justify-end">
                    <span className="text-[10px] text-white/40 truncate">{p.label}</span>
                    <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-emerald-400" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.aside>
      )}

      {!selectedNode && selectedEdge && (
        <motion.aside
          key="edge-config-panel"
          initial={{ x: 280, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 280, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          className="
            w-72 h-full flex flex-col shrink-0
            bg-gray-950/90 border-l border-white/5
            backdrop-blur-sm overflow-hidden
          "
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white/90 truncate">Path Settings</p>
              <p className="text-[10px] text-white/45 mt-0.5 leading-snug truncate">
                {`${selectedEdge.sourceHandle ?? 'source'} → ${selectedEdge.targetHandle ?? 'target'}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedEdge(null)}
              title="Close panel"
              className="
                shrink-0 p-1.5 rounded-md text-white/30
                hover:text-white/70 hover:bg-white/10
                transition-colors duration-150
              "
            >
              <X size={13} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto sidebar-scroll px-4 py-4 space-y-5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-white/60 uppercase tracking-wide">
                Travel Speed
              </label>
              <div className="flex items-center gap-1.5">
                {EDGE_SPEED_PRESETS.map((preset) => {
                  const current = typeof selectedEdge.data?.travelSpeed === 'number' ? selectedEdge.data.travelSpeed : 1
                  const active = Math.abs(current - preset) < 0.001
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => updateEdgeTravelSpeed(selectedEdge.id, preset)}
                      className={`
                        px-2 py-1 rounded-md text-[11px] font-medium
                        border transition-colors
                        ${active
                          ? 'bg-cyan-800/40 border-cyan-400/50 text-cyan-200'
                          : 'bg-white/5 border-white/10 text-white/65 hover:bg-white/10 hover:text-white'}
                      `}
                    >
                      {preset}x
                    </button>
                  )
                })}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0.25}
                  max={3}
                  step={0.25}
                  value={typeof selectedEdge.data?.travelSpeed === 'number' ? selectedEdge.data.travelSpeed : 1}
                  onChange={(e) => updateEdgeTravelSpeed(selectedEdge.id, Number(e.target.value))}
                  className="
                    w-full px-2.5 py-1.5 rounded-md text-[12px]
                    bg-white/5 border border-white/10
                    text-white/80
                    focus:outline-none focus:border-white/30 focus:bg-white/10
                    transition-colors duration-150
                  "
                />
                <span className="text-[11px] text-white/45 shrink-0">x</span>
              </div>
              <p className="text-[10px] text-white/30 leading-relaxed">
                Per-path speed multiplier. 1.00 = default, 0.50 = slower, 2.00 = faster.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[11px] font-medium text-white/60 uppercase tracking-wide">
                  Path Color
                </label>
                <button
                  type="button"
                  onClick={() => updateEdgeColor(selectedEdge.id, undefined)}
                  className="text-[10px] text-white/35 hover:text-white/65 transition-colors"
                >
                  Use global
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={typeof selectedEdge.data?.pathColor === 'string' ? selectedEdge.data.pathColor : globalPathColor}
                  onChange={(e) => updateEdgeColor(selectedEdge.id, e.target.value)}
                  className="h-9 w-12 rounded border border-white/10 bg-transparent cursor-pointer"
                />
                <span className="text-[11px] font-mono text-white/45">
                  {typeof selectedEdge.data?.pathColor === 'string' ? selectedEdge.data.pathColor : `${globalPathColor} (global)`}
                </span>
              </div>
              <p className="text-[10px] text-white/30 leading-relaxed">
                Override this path color or inherit the global path color.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-white/60 uppercase tracking-wide">
                Path Thickness
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {EDGE_THICKNESS_PRESETS.map((preset) => {
                  const current = typeof selectedEdge.data?.pathThickness === 'number' ? selectedEdge.data.pathThickness : 1
                  const active = Math.abs(current - preset) < 0.001
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => updateEdgeThickness(selectedEdge.id, preset)}
                      className={`
                        px-2 py-1 rounded-md text-[11px] font-medium
                        border transition-colors
                        ${active
                          ? 'bg-sky-800/40 border-sky-400/50 text-sky-200'
                          : 'bg-white/5 border-white/10 text-white/65 hover:bg-white/10 hover:text-white'}
                      `}
                    >
                      {preset}x
                    </button>
                  )
                })}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0.5}
                  max={4}
                  step={0.25}
                  value={typeof selectedEdge.data?.pathThickness === 'number' ? selectedEdge.data.pathThickness : 1}
                  onChange={(e) => updateEdgeThickness(selectedEdge.id, Number(e.target.value))}
                  className="
                    w-full px-2.5 py-1.5 rounded-md text-[12px]
                    bg-white/5 border border-white/10
                    text-white/80
                    focus:outline-none focus:border-white/30 focus:bg-white/10
                    transition-colors duration-150
                  "
                />
                <span className="text-[11px] text-white/45 shrink-0">x</span>
              </div>
              <p className="text-[10px] text-white/30 leading-relaxed">
                Adjust visual path thickness for readability.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-white/60 uppercase tracking-wide">
                Execution Priority
              </label>
              <input
                type="number"
                min={1}
                step={1}
                value={
                  typeof (selectedEdge.data as { executionPriority?: unknown } | undefined)?.executionPriority === 'number'
                    ? Math.max(1, Math.floor((selectedEdge.data as { executionPriority?: number }).executionPriority ?? 1))
                    : 1
                }
                onChange={(e) => updateEdgePriority(selectedEdge.id, Number(e.target.value))}
                className="
                  w-full px-2.5 py-1.5 rounded-md text-[12px]
                  bg-white/5 border border-white/10
                  text-white/80
                  focus:outline-none focus:border-white/30 focus:bg-white/10
                  transition-colors duration-150
                "
              />
              <p className="text-[10px] text-white/30 leading-relaxed">
                Same priority runs in parallel. Lower numbers run first.
              </p>
            </div>
          </div>
        </motion.aside>
      )}

      {/* RAG Eval Visualizer — mounted outside the aside so it covers full viewport */}
      <RAGEvalPanel
        open={ragEvalOpen}
        onClose={() => setRagEvalOpen(false)}
        initialK={
          selectedNode?.data.nodeType === 'ragEvaluator'
            ? Number(selectedNode.data.config.k ?? 5)
            : 5
        }
      />
    </AnimatePresence>
  )
}
