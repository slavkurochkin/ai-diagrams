import { useCallback, useEffect, useMemo, useState } from 'react'
import { getAllNodeDefinitions } from '../../lib/nodeDefinitions'
import type { NodeDefinition } from '../../types/nodes'

// ── Palette card ──────────────────────────────────────────────────────────────

interface PaletteCardProps {
  def: NodeDefinition
}

function PaletteCard({ def }: PaletteCardProps) {
  const Icon = def.icon

  const handleDragStart = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.dataTransfer.setData('application/agentflow-node', def.type)
      event.dataTransfer.effectAllowed = 'copy'
    },
    [def.type],
  )

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="
        group flex items-center gap-3 px-3 py-2.5
        rounded-lg border border-white/5
        bg-gray-900/60 hover:bg-gray-800/80
        cursor-grab active:cursor-grabbing
        transition-all duration-150
        hover:border-white/15
        hover:shadow-md
        select-none
      "
      title={def.description}
    >
      {/* Color accent strip */}
      <div
        className="w-1 self-stretch rounded-full shrink-0"
        style={{ background: def.accentColor }}
      />

      {/* Icon */}
      <div
        className="shrink-0 transition-colors duration-150"
        style={{ color: def.accentColor }}
      >
        <Icon size={18} />
      </div>

      {/* Label + description */}
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium text-white/90 leading-tight">
          {def.label}
        </p>
        <p className="text-[10px] text-white/40 leading-snug mt-0.5">
          {def.description}
        </p>
      </div>

      {/* Drag hint */}
      <div className="shrink-0 text-white/20 group-hover:text-white/40 transition-colors duration-150">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <circle cx="4" cy="3" r="1" />
          <circle cx="8" cy="3" r="1" />
          <circle cx="4" cy="6" r="1" />
          <circle cx="8" cy="6" r="1" />
          <circle cx="4" cy="9" r="1" />
          <circle cx="8" cy="9" r="1" />
        </svg>
      </div>
    </div>
  )
}

// ── Category header ───────────────────────────────────────────────────────────

interface CategoryHeaderProps {
  label: string
  count: number
  expanded: boolean
  onToggle: () => void
}

function CategoryHeader({ label, count, expanded, onToggle }: CategoryHeaderProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="
        w-full flex items-center gap-2 px-1 py-1 mt-4 mb-1 first:mt-0
        rounded-md text-left
        hover:bg-white/[0.03]
        transition-colors duration-150
      "
      aria-expanded={expanded}
    >
      <svg
        width="10"
        height="10"
        viewBox="0 0 10 10"
        fill="none"
        className="shrink-0 transition-transform duration-150"
        style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
      >
        <path d="M3 2 L7 5 L3 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-[10px] font-semibold uppercase tracking-widest text-white/35">
        {label}
      </span>
      <span className="text-[10px] text-white/20 tabular-nums">
        {count}
      </span>
      <div className="flex-1 h-px bg-white/5" />
    </button>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  core:   'Core',
  data:   'Data',
  flow:   'Flow Control',
  tool:   'Tools',
  output: 'Output',
  eval:   'Evaluation',
}

const CATEGORY_ORDER = ['core', 'data', 'flow', 'tool', 'output', 'eval']
const SIDEBAR_STORAGE_KEY = 'agentflow.sidebar.sections'
const DEFAULT_EXPANDED: Record<string, boolean> = {
  core: true,
  data: false,
  flow: false,
  tool: false,
  output: false,
  eval: false,
}

export default function Sidebar() {
  const defs = getAllNodeDefinitions()
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(DEFAULT_EXPANDED)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SIDEBAR_STORAGE_KEY)
      if (!raw) return

      const parsed = JSON.parse(raw) as Record<string, boolean>
      setExpandedSections((prev) => ({ ...prev, ...parsed }))
    } catch {
      // Ignore invalid persisted sidebar state.
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(expandedSections))
    } catch {
      // Ignore storage failures in restricted environments.
    }
  }, [expandedSections])

  // Group definitions by category, preserving the desired category order
  const grouped = useMemo(
    () => CATEGORY_ORDER.reduce<Record<string, NodeDefinition[]>>(
      (acc, cat) => {
        const items = defs.filter((d) => d.category === cat)
        if (items.length > 0) acc[cat] = items
        return acc
      },
      {},
    ),
    [defs],
  )

  const toggleCategory = useCallback((category: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [category]: !(prev[category] ?? DEFAULT_EXPANDED[category] ?? true),
    }))
  }, [])

  return (
    <aside
      className="
        w-56 h-full flex flex-col shrink-0
        bg-gray-950/90 dark:bg-gray-950/90 border-r border-white/5
        backdrop-blur-sm
      "
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
          Node Palette
        </p>
        <p className="text-[10px] text-white/25 mt-0.5">
          Drag to canvas to add
        </p>
      </div>

      {/* Scrollable node list */}
      <div className="flex-1 overflow-y-auto sidebar-scroll px-3 py-3 space-y-0.5">
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
            <CategoryHeader
              label={CATEGORY_LABELS[cat] ?? cat}
              count={items.length}
              expanded={expandedSections[cat] ?? DEFAULT_EXPANDED[cat] ?? true}
              onToggle={() => toggleCategory(cat)}
            />
            {(expandedSections[cat] ?? DEFAULT_EXPANDED[cat] ?? true) && (
              <div className="space-y-1">
                {items.map((def) => (
                  <PaletteCard key={def.type} def={def} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-2.5 border-t border-white/5">
        <p className="text-[10px] text-white/20 text-center">
          {defs.length} node types
        </p>
      </div>
    </aside>
  )
}
