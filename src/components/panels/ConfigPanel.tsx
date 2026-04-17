import { useCallback, useMemo, useState, type FocusEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trash2, StickyNote, BarChart2, ChevronDown } from 'lucide-react'
import { useFlowStore } from '../../hooks/useFlowStore'
import { getNodeDefinition } from '../../lib/nodeDefinitions'
import { sanitizeConfigTextValue } from '../../lib/sanitizeConfigTextValue'
import { resolvePortAxisPercent } from '../../lib/portLayout'
import { portHandleFill } from '../../lib/portVisual'
import type { NotePlacement, PortDefinition } from '../../types/nodes'
import type { ConfigField } from '../../types/nodes'
import RAGEvalPanel from './RAGEvalPanel'

/** Same ordering as canvas `portOrder` (YAML / persisted). */
function applyPortOrder(ports: PortDefinition[], order?: string[]): PortDefinition[] {
  if (!order || order.length === 0) return ports
  const byId = Object.fromEntries(ports.map((p) => [p.id, p]))
  const ordered = order.map((id) => byId[id]).filter((p): p is PortDefinition => p != null)
  const rest = ports.filter((p) => !order.includes(p.id))
  return [...ordered, ...rest]
}

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
  const isDark = useFlowStore((s) => s.theme === 'dark')
  const blurSanitize =
    field.rejectTrimmedCaseInsensitive && field.rejectTrimmedCaseInsensitive.length > 0
      ? (e: FocusEvent<HTMLInputElement>) => {
          const next = sanitizeConfigTextValue(field, e.target.value)
          if (next !== e.target.value) onChange(next)
        }
      : undefined
  return (
    <input
      type="text"
      value={String(value)}
      placeholder={field.placeholder}
      onChange={(e) => onChange(e.target.value)}
      onBlur={blurSanitize}
      className={`
        w-full px-2.5 py-1.5 rounded-md text-[12px]
        transition-colors duration-150 focus:outline-none
        ${isDark
          ? 'bg-white/5 border border-white/10 text-white/80 placeholder-white/25 focus:border-white/30 focus:bg-white/10'
          : 'bg-white border border-indigo-200/80 text-slate-800 placeholder-slate-400 focus:border-indigo-400/60 focus:bg-white'}
      `}
    />
  )
}

function TextareaField({ field, value, onChange }: FieldProps) {
  const isDark = useFlowStore((s) => s.theme === 'dark')
  const blurSanitize =
    field.rejectTrimmedCaseInsensitive && field.rejectTrimmedCaseInsensitive.length > 0
      ? (e: FocusEvent<HTMLTextAreaElement>) => {
          const next = sanitizeConfigTextValue(field, e.target.value)
          if (next !== e.target.value) onChange(next)
        }
      : undefined
  return (
    <textarea
      value={String(value)}
      placeholder={field.placeholder}
      rows={4}
      onChange={(e) => onChange(e.target.value)}
      onBlur={blurSanitize}
      className={`
        w-full px-2.5 py-1.5 rounded-md text-[12px] resize-none
        transition-colors duration-150 font-mono leading-relaxed focus:outline-none
        ${isDark
          ? 'bg-white/5 border border-white/10 text-white/80 placeholder-white/25 focus:border-white/30 focus:bg-white/10'
          : 'bg-white border border-indigo-200/80 text-slate-800 placeholder-slate-400 focus:border-indigo-400/60 focus:bg-white'}
      `}
    />
  )
}

function NumberField({ field, value, onChange }: FieldProps) {
  const isDark = useFlowStore((s) => s.theme === 'dark')
  return (
    <input
      type="number"
      value={Number(value)}
      min={field.min}
      max={field.max}
      step={field.step}
      onChange={(e) => onChange(Number(e.target.value))}
      className={`
        w-full px-2.5 py-1.5 rounded-md text-[12px]
        transition-colors duration-150 focus:outline-none
        ${isDark
          ? 'bg-white/5 border border-white/10 text-white/80 focus:border-white/30 focus:bg-white/10'
          : 'bg-white border border-indigo-200/80 text-slate-800 focus:border-indigo-400/60 focus:bg-white'}
      `}
    />
  )
}

function SelectField({ field, value, onChange }: FieldProps) {
  const isDark = useFlowStore((s) => s.theme === 'dark')
  return (
    <select
      value={String(value)}
      onChange={(e) => onChange(e.target.value)}
      className={`
        w-full px-2.5 py-1.5 rounded-md text-[12px]
        transition-colors duration-150 cursor-pointer focus:outline-none
        ${isDark
          ? 'bg-gray-800 border border-white/10 text-white/80 focus:border-white/30'
          : 'bg-white border border-indigo-200/80 text-slate-800 focus:border-indigo-400/60'}
      `}
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
  const isDark = useFlowStore((s) => s.theme === 'dark')
  const raw = Number(value)
  const num = Number.isFinite(raw)
    ? raw
    : typeof field.defaultValue === 'number'
      ? field.defaultValue
      : field.min ?? 0
  const showPercent = field.key === 'opacity' && field.min === 0 && field.max === 1
  const labelText = showPercent ? `${Math.round(num * 100)}%` : String(num)
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
      <span className={`text-[11px] font-mono w-10 text-right shrink-0 ${isDark ? 'text-white/60' : 'text-slate-500'}`}>
        {labelText}
      </span>
    </div>
  )
}

function ColorField({ value, onChange }: FieldProps) {
  const isDark = useFlowStore((s) => s.theme === 'dark')
  const hex = typeof value === 'string' ? value : '#888888'
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={hex}
        onChange={(e) => onChange(e.target.value)}
        className={`h-8 w-10 rounded bg-transparent cursor-pointer ${isDark ? 'border border-white/10' : 'border border-indigo-200/80'}`}
      />
      <input
        type="text"
        value={hex}
        onChange={(e) => onChange(e.target.value)}
        className={`
          flex-1 px-2.5 py-1.5 rounded-md text-[12px] font-mono
          transition-colors duration-150 focus:outline-none
          ${isDark
            ? 'bg-white/5 border border-white/10 text-white/80 placeholder-white/25 focus:border-white/30 focus:bg-white/10'
            : 'bg-white border border-indigo-200/80 text-slate-800 placeholder-slate-400 focus:border-indigo-400/60 focus:bg-white'}
        `}
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
  const isDark = useFlowStore((s) => s.theme === 'dark')
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label className={`text-[11px] font-medium uppercase tracking-wide ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
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
        <p className={`text-[10px] leading-relaxed ${isDark ? 'text-white/30' : 'text-slate-500'}`}>
          {field.description}
        </p>
      )}
    </div>
  )
}

// ── Config Panel ───────────────────────────────────────────────────────────────

export default function ConfigPanel() {
  const { selectedNodeId, selectedEdgeId, nodes, edges, globalPathColor, layoutDirection, theme, updateNodeConfig, updateNodeLabel, updateNodeDescription, updateEdgePriority, updateEdgeTravelSpeed, updateEdgeThickness, updateEdgeColor, updateNodeNote, updateNodeAccentColor, updateNodeHeaderTextColor, toggleNodeNoteVisible, updateNodeNotePlacement, updateNodePortOffset, bringFrameToFront, sendFrameToBack, removeNode, setSelectedNode, setSelectedEdge } =
    useFlowStore()
  const isDark = theme === 'dark'

  const selectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId)
    : null
  const selectedEdge = selectedEdgeId
    ? edges.find((e) => e.id === selectedEdgeId)
    : null

  const def = selectedNode ? getNodeDefinition(selectedNode.data.nodeType) : null
  const isFrameNode = selectedNode?.data.nodeType === 'frame'
  const isTextNode = selectedNode?.data.nodeType === 'text'
  const descriptionFieldValue = (() => {
    if (!selectedNode) return ''
    if (selectedNode.data.description !== undefined) {
      return selectedNode.data.description
    }
    const legacy =
      selectedNode.data.nodeType.startsWith('generic') &&
      typeof selectedNode.data.config.description === 'string'
        ? selectedNode.data.config.description
        : ''
    return legacy
  })()
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
  const characterDependencyOptions = useMemo(() => {
    if (!selectedNode || selectedNode.data.nodeType !== 'character') {
      return [{ value: '', label: 'None' }]
    }
    const others = nodes
      .filter((n) => n.data.nodeType === 'character' && n.id !== selectedNode.id)
      .map((n) => ({
        value: n.id,
        label: `${n.data.label} (${n.id})`,
      }))
    return [{ value: '', label: 'None' }, ...others]
  }, [nodes, selectedNode])

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
  const [portsSectionOpen, setPortsSectionOpen] = useState(false)

  return (
    <AnimatePresence>
      {selectedNode && def && (
        <motion.aside
          key="config-panel"
          initial={{ x: 280, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 280, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          className="w-72 h-full flex flex-col shrink-0 backdrop-blur-sm overflow-hidden"
          style={{
            background: isDark ? 'rgba(3,7,18,0.9)' : 'rgba(248,250,255,0.92)',
            borderLeft: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(99,102,241,0.16)',
          }}
        >
          {/* ── Header ──────────────────────────────────────────────────── */}
          <div
            className="flex items-center gap-2 px-4 py-3"
            style={{
              borderBottom: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(99,102,241,0.16)',
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
                  w-full text-[13px] font-semibold bg-transparent
                  border-b border-transparent
                  focus:outline-none transition-colors duration-150 truncate
                "
                style={{
                  color: isDark ? 'rgba(255,255,255,0.9)' : '#1e293b',
                }}
              />
              <p className={`text-[10px] mt-0.5 leading-snug ${isDark ? 'text-white/45' : 'text-slate-500'}`}>
                {def.description}
              </p>
            </div>

            {/* Delete */}
            <button
              type="button"
              onClick={handleDelete}
              title="Delete node"
              className="
                shrink-0 p-1.5 rounded-md hover:text-red-400 hover:bg-red-500/10
                transition-colors duration-150
              "
              style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(71,85,105,0.7)' }}
            >
              <Trash2 size={13} />
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={() => setSelectedNode(null)}
              title="Close panel"
              className="
                shrink-0 p-1.5 rounded-md transition-colors duration-150
                hover:bg-white/10
              "
              style={{
                color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(71,85,105,0.7)',
              }}
            >
              <X size={13} />
            </button>
          </div>

          {/* ── Scrollable fields ────────────────────────────────────────── */}
          <div className={`flex-1 overflow-y-auto sidebar-scroll px-4 py-4 space-y-5 ${isDark ? 'text-white' : 'text-slate-800'}`}>
            <div className="space-y-1.5">
              <label className={`text-[11px] font-medium uppercase tracking-wide ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                Description
              </label>
              <textarea
                value={descriptionFieldValue}
                placeholder="What this node does in this diagram (helps AI and collaborators)…"
                rows={3}
                onChange={(e) => updateNodeDescription(selectedNode.id, e.target.value)}
                className={`
                  w-full px-2.5 py-1.5 rounded-md text-[12px] resize-none
                  transition-colors duration-150 leading-relaxed focus:outline-none
                  ${isDark
                    ? 'bg-white/5 border border-white/10 text-white/80 placeholder-white/25 focus:border-white/30 focus:bg-white/10'
                    : 'bg-white border border-indigo-200/80 text-slate-800 placeholder-slate-400 focus:border-indigo-400/60 focus:bg-white'}
                `}
              />
              <p className={`text-[10px] leading-relaxed ${isDark ? 'text-white/30' : 'text-slate-500'}`}>
                Shown only here and in AI context — not on the canvas. Use Note for markdown beside the node.
              </p>
            </div>

            {def.configFields
              .filter((field) => {
                if (!field.visibleWhen) return true
                return selectedNode.data.config[field.visibleWhen.key] === field.visibleWhen.value
              })
              .map((field) => {
                if (
                  selectedNode.data.nodeType === 'character' &&
                  field.key === 'dependsOnCharacterId' &&
                  field.type === 'select'
                ) {
                  const value = String(selectedNode.data.config[field.key] ?? '')
                  return (
                    <div key={field.key} className="space-y-1.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <label className={`text-[11px] font-medium uppercase tracking-wide ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                          {field.label}
                        </label>
                      </div>
                      <select
                        value={value}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        className={`
                          w-full px-2.5 py-1.5 rounded-md text-[12px]
                          transition-colors duration-150 cursor-pointer focus:outline-none
                          ${isDark
                            ? 'bg-gray-800 border border-white/10 text-white/80 focus:border-white/30'
                            : 'bg-white border border-indigo-200/80 text-slate-800 focus:border-indigo-400/60'}
                        `}
                      >
                        {characterDependencyOptions.map((opt) => (
                          <option key={opt.value || 'none'} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      {field.description && (
                        <p className={`text-[10px] leading-relaxed ${isDark ? 'text-white/30' : 'text-slate-500'}`}>
                          {field.description}
                        </p>
                      )}
                    </div>
                  )
                }

                return (
                  <FieldRow
                    key={field.key}
                    field={field}
                    value={selectedNode.data.config[field.key] ?? field.defaultValue}
                    onChange={(val) => handleChange(field.key, val)}
                  />
                )
              })}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className={`text-[11px] font-medium uppercase tracking-wide ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                  {isFrameNode ? 'Frame Color' : isTextNode ? 'Text Color' : 'Card Color'}
                </label>
                <button
                  type="button"
                  onClick={() => updateNodeAccentColor(selectedNode.id, undefined)}
                  className={`text-[10px] transition-colors ${isDark ? 'text-white/35 hover:text-white/65' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Use default
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => updateNodeAccentColor(selectedNode.id, e.target.value)}
                  className={`h-9 w-12 rounded bg-transparent cursor-pointer ${isDark ? 'border border-white/10' : 'border border-indigo-200/80'}`}
                />
                <input
                  type="text"
                  value={selectedNode.data.accentColor ?? ''}
                  placeholder={def.accentColor}
                  onChange={(e) => updateNodeAccentColor(selectedNode.id, e.target.value || undefined)}
                  className={`
                    flex-1 px-2.5 py-1.5 rounded-md text-[12px] font-mono
                    transition-colors duration-150 focus:outline-none
                    ${isDark
                      ? 'bg-white/5 border border-white/10 text-white/80 placeholder-white/25 focus:border-white/30 focus:bg-white/10'
                      : 'bg-white border border-indigo-200/80 text-slate-800 placeholder-slate-400 focus:border-indigo-400/60'}
                  `}
                />
              </div>
              <p className={`text-[10px] leading-relaxed ${isDark ? 'text-white/30' : 'text-slate-500'}`}>
                {isFrameNode
                  ? 'Override this frame’s tint without changing the default color for all frame nodes.'
                  : isTextNode
                  ? 'Override this text annotation color without changing the default color for all text nodes.'
                  : 'Override this node’s accent color without changing the default color for the whole component type.'}
              </p>
            </div>

            {!isTextNode && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className={`text-[11px] font-medium uppercase tracking-wide ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                    {isFrameNode ? 'Title text' : 'Header text'}
                  </label>
                  <button
                    type="button"
                    onClick={() => updateNodeHeaderTextColor(selectedNode.id, undefined)}
                    className={`text-[10px] transition-colors ${isDark ? 'text-white/35 hover:text-white/65' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Use default
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={selectedNode.data.headerTextColor?.trim() || '#ffffff'}
                    onChange={(e) => updateNodeHeaderTextColor(selectedNode.id, e.target.value)}
                    className={`h-9 w-12 rounded bg-transparent cursor-pointer ${isDark ? 'border border-white/10' : 'border border-indigo-200/80'}`}
                  />
                  <input
                    type="text"
                    value={selectedNode.data.headerTextColor ?? ''}
                    placeholder="#1e293b"
                    onChange={(e) => updateNodeHeaderTextColor(selectedNode.id, e.target.value || undefined)}
                    className={`
                      flex-1 px-2.5 py-1.5 rounded-md text-[12px] font-mono
                      transition-colors duration-150 focus:outline-none
                      ${isDark
                        ? 'bg-white/5 border border-white/10 text-white/80 placeholder-white/25 focus:border-white/30 focus:bg-white/10'
                        : 'bg-white border border-indigo-200/80 text-slate-800 placeholder-slate-400 focus:border-indigo-400/60 focus:bg-white'}
                    `}
                  />
                </div>
                <p className={`text-[10px] leading-relaxed ${isDark ? 'text-white/30' : 'text-slate-500'}`}>
                  {isFrameNode
                    ? 'Color for the frame title. Default follows theme (light text on dark canvas, dark text on light).'
                    : 'Color for the title and icon on the colored header bar — use a dark color on bright accents (e.g. green) for readability.'}
                </p>
              </div>
            )}

            {isFrameNode && frameNodes.length > 1 && (
              <div className="space-y-1.5">
                <label className={`text-[11px] font-medium uppercase tracking-wide ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                  Frame Layer
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => bringFrameToFront(selectedNode.id)}
                    className="
                      px-2 py-1 rounded-md text-[11px] font-medium
                      transition-colors
                    "
                    style={isDark
                      ? { background: 'rgba(8,145,178,0.35)', border: '1px solid rgba(34,211,238,0.45)', color: 'rgb(165,243,252)' }
                      : { background: 'rgba(79,70,229,0.12)', border: '1px solid rgba(79,70,229,0.34)', color: 'rgb(67,56,202)' }
                    }
                  >
                    Bring to front
                  </button>
                  <button
                    type="button"
                    onClick={() => sendFrameToBack(selectedNode.id)}
                    className="
                      px-2 py-1 rounded-md text-[11px] font-medium
                      transition-colors
                    "
                    style={isDark
                      ? { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }
                      : { background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(99,102,241,0.2)', color: 'rgb(51,65,85)' }
                    }
                  >
                    Send to back
                  </button>
                </div>
                <p className={`text-[10px] leading-relaxed ${isDark ? 'text-white/30' : 'text-slate-500'}`}>
                  Frames stay behind regular nodes, but you can reorder them to avoid blur from overlaps.
                </p>

                <label className={`text-[11px] font-medium uppercase tracking-wide ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
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
                            ? (isDark ? 'bg-cyan-900/35 border-cyan-500/45 text-cyan-200' : 'bg-indigo-100 border-indigo-300/70 text-indigo-700')
                            : (isDark ? 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white' : 'bg-white border-indigo-200/80 text-slate-700 hover:bg-slate-100 hover:text-slate-900')}
                        `}
                      >
                        {frame.title}
                      </button>
                    )
                  })}
                </div>
                <p className={`text-[10px] leading-relaxed ${isDark ? 'text-white/30' : 'text-slate-500'}`}>
                  Frames are ordered from smaller to larger so nested groups are easier to pick.
                </p>
              </div>
            )}

            {/* ── Path priorities ───────────────────────────────────────── */}
            {!isFrameNode && !isTextNode && outgoingEdges.length > 0 && (
              <div className="space-y-2">
                <label className={`text-[11px] font-medium uppercase tracking-wide ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
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
                        <div className={`flex-1 min-w-0 text-[11px] truncate ${isDark ? 'text-white/65' : 'text-slate-600'}`}>
                          {sourceLabel} → {targetLabel}
                        </div>
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={priority}
                          onChange={(e) => updateEdgePriority(edge.id, Number(e.target.value))}
                          className={`
                            w-16 px-2 py-1 rounded-md text-[11px] text-right
                            transition-colors duration-150 focus:outline-none
                            ${isDark
                              ? 'bg-white/5 border border-white/10 text-white/85 focus:border-white/30 focus:bg-white/10'
                              : 'bg-white border border-indigo-200/80 text-slate-800 focus:border-indigo-400/60'}
                          `}
                        />
                      </div>
                    )
                  })}
                </div>
                <p className={`text-[10px] leading-relaxed ${isDark ? 'text-white/30' : 'text-slate-500'}`}>
                  Same number runs in parallel. Lower numbers run first (1 → 2 → 3).
                </p>
              </div>
            )}

            {/* ── Note (markdown) ──────────────────────────────────────── */}
            {!isFrameNode && !isTextNode && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <StickyNote size={11} className={isDark ? 'text-white/30' : 'text-slate-500'} />
                <label className={`text-[11px] font-medium uppercase tracking-wide ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                  Note
                </label>
                <div className="flex items-center gap-1.5 ml-auto">
                <span className={`text-[10px] ${isDark ? 'text-white/25' : 'text-slate-500'}`}>
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
                className={`
                  w-full px-2.5 py-1.5 rounded-md text-[12px] resize-none
                  transition-colors duration-150 font-mono leading-relaxed focus:outline-none
                  ${isDark
                    ? 'bg-white/5 border border-white/10 text-white/80 placeholder-white/20 focus:border-white/30 focus:bg-white/10'
                    : 'bg-white border border-indigo-200/80 text-slate-800 placeholder-slate-400 focus:border-indigo-400/60'}
                `}
              />
              <div className="space-y-1.5">
                <label className={`text-[11px] font-medium uppercase tracking-wide ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                  Note Placement
                </label>
                <select
                  value={selectedNode.data.notePlacement ?? 'auto'}
                  onChange={(e) => updateNodeNotePlacement(selectedNode.id, e.target.value as NotePlacement)}
                  className={`
                    w-full px-2.5 py-1.5 rounded-md text-[12px]
                    transition-colors duration-150 cursor-pointer focus:outline-none
                    ${isDark
                      ? 'bg-gray-800 border border-white/10 text-white/80 focus:border-white/30'
                      : 'bg-white border border-indigo-200/80 text-slate-800 focus:border-indigo-400/60'}
                  `}
                >
                  <option value="auto">Auto (current default)</option>
                  <option value="right">Right</option>
                  <option value="bottom">Bottom</option>
                </select>
                <p className={`text-[10px] leading-relaxed ${isDark ? 'text-white/30' : 'text-slate-500'}`}>
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

          {/* ── Port position (sliders) — same order as canvas ───────────── */}
          {!isFrameNode && !isTextNode && selectedNode && def && (def.inputs.length > 0 || def.outputs.length > 0) && (
            <div
              className="px-4 py-2.5 border-t"
              style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(99,102,241,0.16)' }}
            >
              <button
                type="button"
                onClick={() => setPortsSectionOpen((o) => !o)}
                aria-expanded={portsSectionOpen}
                className={`flex w-full items-center justify-between gap-2 rounded-md py-1 text-left -mx-1 px-1 transition-colors ${isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-100'}`}
              >
                <div className="flex min-w-0 flex-1 items-baseline gap-2">
                  <span className={`text-[11px] font-medium uppercase tracking-wide shrink-0 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                    Ports
                  </span>
                  {!portsSectionOpen && (
                    <span className={`truncate text-[10px] font-normal normal-case ${isDark ? 'text-white/30' : 'text-slate-500'}`}>
                      {def.inputs.length} in · {def.outputs.length} out · sliders
                    </span>
                  )}
                </div>
                <ChevronDown
                  size={14}
                  className={`shrink-0 transition-transform duration-200 ${isDark ? 'text-white/35' : 'text-slate-500'} ${
                    portsSectionOpen ? 'rotate-180' : ''
                  }`}
                  aria-hidden
                />
              </button>
              {portsSectionOpen && (
              <div className="mt-2 space-y-2">
              <p className={`text-[10px] leading-relaxed ${isDark ? 'text-white/30' : 'text-slate-500'}`}>
                <span className={isDark ? 'text-white/45' : 'text-slate-700'}>Sliders</span> set where each handle sits on the node edge (0–100%).{' '}
                {layoutDirection === 'LR'
                  ? 'Along the left or right side, 0% is at the top and 100% at the bottom.'
                  : 'Along the top or bottom edge, 0% is at the start and 100% at the end.'}
              </p>
              <p className={`text-[10px] leading-relaxed ${isDark ? 'text-white/30' : 'text-slate-500'}`}>
                Hold Option/Alt and drag a port on the canvas to match, or use Auto to clear the override.
              </p>
              <div className="space-y-2 pt-1">
                {applyPortOrder(def.inputs, selectedNode.data.portOrder?.inputs).map((port, i, arr) => {
                  const value = resolvePortAxisPercent(port, i, arr.length, selectedNode.data.portOffsets)
                  const hasOverride = selectedNode.data.portOffsets?.[port.id] !== undefined
                  const dot = portHandleFill(port.type, 'input')
                  return (
                    <div
                      key={`in-${port.id}`}
                      className={`space-y-1 rounded-lg border px-2.5 py-2 ${
                        isDark
                          ? 'border-white/10 bg-white/[0.03]'
                          : 'border-indigo-200/70 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ring-1 ${isDark ? 'ring-white/10' : 'ring-slate-300/80'}`}
                          style={{ background: dot }}
                        />
                        <span className={`text-[10px] truncate min-w-0 flex-1 ${isDark ? 'text-white/50' : 'text-slate-600'}`} title={port.id}>
                          In · {port.label}
                        </span>
                        {hasOverride && (
                          <button
                            type="button"
                            onClick={() => updateNodePortOffset(selectedNode.id, port.id, null)}
                            className={`text-[9px] transition-colors shrink-0 ${isDark ? 'text-white/35 hover:text-white/65' : 'text-slate-500 hover:text-slate-800'}`}
                          >
                            Auto
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={Math.round(value)}
                          onChange={(e) =>
                            updateNodePortOffset(selectedNode.id, port.id, Number(e.target.value))
                          }
                          className="min-w-0 flex-1 h-1.5"
                          style={{ accentColor: dot }}
                        />
                        <span className={`text-[9px] font-mono w-7 text-right tabular-nums shrink-0 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                          {Math.round(value)}
                        </span>
                      </div>
                    </div>
                  )
                })}
                {applyPortOrder(def.outputs, selectedNode.data.portOrder?.outputs).map((port, i, arr) => {
                  const value = resolvePortAxisPercent(port, i, arr.length, selectedNode.data.portOffsets)
                  const hasOverride = selectedNode.data.portOffsets?.[port.id] !== undefined
                  const dot = portHandleFill(port.type, 'output')
                  return (
                    <div
                      key={`out-${port.id}`}
                      className={`space-y-1 rounded-lg border px-2.5 py-2 ${
                        isDark
                          ? 'border-white/10 bg-white/[0.03]'
                          : 'border-indigo-200/70 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ring-1 ${isDark ? 'ring-white/10' : 'ring-slate-300/80'}`}
                          style={{ background: dot }}
                        />
                        <span className={`text-[10px] truncate min-w-0 flex-1 ${isDark ? 'text-white/50' : 'text-slate-600'}`} title={port.id}>
                          Out · {port.label}
                        </span>
                        {hasOverride && (
                          <button
                            type="button"
                            onClick={() => updateNodePortOffset(selectedNode.id, port.id, null)}
                            className={`text-[9px] transition-colors shrink-0 ${isDark ? 'text-white/35 hover:text-white/65' : 'text-slate-500 hover:text-slate-800'}`}
                          >
                            Auto
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={Math.round(value)}
                          onChange={(e) =>
                            updateNodePortOffset(selectedNode.id, port.id, Number(e.target.value))
                          }
                          className="min-w-0 flex-1 h-1.5"
                          style={{ accentColor: dot }}
                        />
                        <span className={`text-[9px] font-mono w-7 text-right tabular-nums shrink-0 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                          {Math.round(value)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
              </div>
              )}
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
          className="w-72 h-full flex flex-col shrink-0 backdrop-blur-sm overflow-hidden"
          style={{
            background: isDark ? 'rgba(3,7,18,0.9)' : 'rgba(248,250,255,0.92)',
            borderLeft: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(99,102,241,0.16)',
          }}
        >
          <div
            className="flex items-center gap-2 px-4 py-3"
            style={{ borderBottom: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(99,102,241,0.16)' }}
          >
            <div className="flex-1 min-w-0">
              <p className={`text-[13px] font-semibold truncate ${isDark ? 'text-white/90' : 'text-slate-800'}`}>Path Settings</p>
              <p className={`text-[10px] mt-0.5 leading-snug truncate ${isDark ? 'text-white/45' : 'text-slate-500'}`}>
                {`${selectedEdge.sourceHandle ?? 'source'} → ${selectedEdge.targetHandle ?? 'target'}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedEdge(null)}
              title="Close panel"
              className="
                shrink-0 p-1.5 rounded-md
                hover:bg-white/10
                transition-colors duration-150
              "
              style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(71,85,105,0.7)' }}
            >
              <X size={13} />
            </button>
          </div>

          <div className={`flex-1 overflow-y-auto sidebar-scroll px-4 py-4 space-y-5 ${isDark ? 'text-white' : 'text-slate-800'}`}>
            <div className="space-y-1.5">
              <label className={`text-[11px] font-medium uppercase tracking-wide ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
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
                          ? (isDark ? 'bg-cyan-800/40 border-cyan-400/50 text-cyan-200' : 'bg-indigo-100 border-indigo-300/70 text-indigo-700')
                          : (isDark ? 'bg-white/5 border-white/10 text-white/65 hover:bg-white/10 hover:text-white' : 'bg-white border-indigo-200/80 text-slate-700 hover:bg-slate-100 hover:text-slate-900')}
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
                  className={`
                    w-full px-2.5 py-1.5 rounded-md text-[12px]
                    transition-colors duration-150 focus:outline-none
                    ${isDark
                      ? 'bg-white/5 border border-white/10 text-white/80 focus:border-white/30 focus:bg-white/10'
                      : 'bg-white border border-indigo-200/80 text-slate-800 focus:border-indigo-400/60'}
                  `}
                />
                <span className={`text-[11px] shrink-0 ${isDark ? 'text-white/45' : 'text-slate-500'}`}>x</span>
              </div>
              <p className={`text-[10px] leading-relaxed ${isDark ? 'text-white/30' : 'text-slate-500'}`}>
                Per-path speed multiplier. 1.00 = default, 0.50 = slower, 2.00 = faster.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className={`text-[11px] font-medium uppercase tracking-wide ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                  Path Color
                </label>
                <button
                  type="button"
                  onClick={() => updateEdgeColor(selectedEdge.id, undefined)}
                  className={`text-[10px] transition-colors ${isDark ? 'text-white/35 hover:text-white/65' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Use global
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={typeof selectedEdge.data?.pathColor === 'string' ? selectedEdge.data.pathColor : globalPathColor}
                  onChange={(e) => updateEdgeColor(selectedEdge.id, e.target.value)}
                  className={`h-9 w-12 rounded bg-transparent cursor-pointer ${isDark ? 'border border-white/10' : 'border border-indigo-200/80'}`}
                />
                <span className={`text-[11px] font-mono ${isDark ? 'text-white/45' : 'text-slate-600'}`}>
                  {typeof selectedEdge.data?.pathColor === 'string' ? selectedEdge.data.pathColor : `${globalPathColor} (global)`}
                </span>
              </div>
              <p className={`text-[10px] leading-relaxed ${isDark ? 'text-white/30' : 'text-slate-500'}`}>
                Override this path color or inherit the global path color.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className={`text-[11px] font-medium uppercase tracking-wide ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
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
                          ? (isDark ? 'bg-sky-800/40 border-sky-400/50 text-sky-200' : 'bg-indigo-100 border-indigo-300/70 text-indigo-700')
                          : (isDark ? 'bg-white/5 border-white/10 text-white/65 hover:bg-white/10 hover:text-white' : 'bg-white border-indigo-200/80 text-slate-700 hover:bg-slate-100 hover:text-slate-900')}
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
                  className={`
                    w-full px-2.5 py-1.5 rounded-md text-[12px]
                    transition-colors duration-150 focus:outline-none
                    ${isDark
                      ? 'bg-white/5 border border-white/10 text-white/80 focus:border-white/30 focus:bg-white/10'
                      : 'bg-white border border-indigo-200/80 text-slate-800 focus:border-indigo-400/60'}
                  `}
                />
                <span className={`text-[11px] shrink-0 ${isDark ? 'text-white/45' : 'text-slate-500'}`}>x</span>
              </div>
              <p className={`text-[10px] leading-relaxed ${isDark ? 'text-white/30' : 'text-slate-500'}`}>
                Adjust visual path thickness for readability.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className={`text-[11px] font-medium uppercase tracking-wide ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
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
                className={`
                  w-full px-2.5 py-1.5 rounded-md text-[12px]
                  transition-colors duration-150 focus:outline-none
                  ${isDark
                    ? 'bg-white/5 border border-white/10 text-white/80 focus:border-white/30 focus:bg-white/10'
                    : 'bg-white border border-indigo-200/80 text-slate-800 focus:border-indigo-400/60'}
                `}
              />
              <p className={`text-[10px] leading-relaxed ${isDark ? 'text-white/30' : 'text-slate-500'}`}>
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
