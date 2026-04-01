import { useCallback } from 'react'
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

function CategoryHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-1 mt-4 mb-1.5 first:mt-0">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
        {label}
      </span>
      <div className="flex-1 h-px bg-white/5" />
    </div>
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

export default function Sidebar() {
  const defs = getAllNodeDefinitions()

  // Group definitions by category, preserving the desired category order
  const grouped = CATEGORY_ORDER.reduce<Record<string, NodeDefinition[]>>(
    (acc, cat) => {
      const items = defs.filter((d) => d.category === cat)
      if (items.length > 0) acc[cat] = items
      return acc
    },
    {},
  )

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
            <CategoryHeader label={CATEGORY_LABELS[cat] ?? cat} />
            <div className="space-y-1">
              {items.map((def) => (
                <PaletteCard key={def.type} def={def} />
              ))}
            </div>
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
