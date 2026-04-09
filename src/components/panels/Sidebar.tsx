import { useCallback, useEffect, useMemo, useState } from 'react'
import { getAllNodeDefinitions } from '../../lib/nodeDefinitions'
import type { NodeDefinition } from '../../types/nodes'
import { CHARACTER_VARIANTS } from '../nodes/CharacterNode'

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

// ── Character thumbnails ──────────────────────────────────────────────────────

const CHAR_THUMB: Record<string, string> = {
  person: `<circle cx="40" cy="17" r="11" stroke="currentColor" stroke-width="2.5" fill="currentColor" fill-opacity="0.13"/>
    <line x1="40" y1="28" x2="40" y2="60" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M40 42 L22 56" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M40 42 L58 56" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M40 60 L28 82" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M40 60 L52 82" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>`,
  woman: `<path d="M31 11 Q14 20 13 64" stroke="#a0522d" stroke-width="6" stroke-linecap="round"/>
    <path d="M49 11 Q66 20 67 64" stroke="#a0522d" stroke-width="6" stroke-linecap="round"/>
    <path d="M27 16 Q28 4 40 4 Q52 4 53 16" stroke="#a0522d" stroke-width="4.5" stroke-linecap="round" fill="none"/>
    <circle cx="40" cy="17" r="12" stroke="currentColor" stroke-width="2.5" fill="currentColor" fill-opacity="0.13"/>
    <path d="M32 29 L18 73 L62 73 L48 29 Z" stroke="#6b7db3" stroke-width="2" fill="#6b7db3" fill-opacity="0.22" stroke-linejoin="round"/>
    <path d="M33 33 L14 53" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M47 33 L66 53" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M26 73 L22 91" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M54 73 L58 91" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>`,
  man: `<circle cx="40" cy="14" r="11" stroke="currentColor" stroke-width="2.5" fill="currentColor" fill-opacity="0.13"/>
    <path d="M29 25 L24 58 L56 58 L51 25 Z" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity="0.10" stroke-linejoin="round"/>
    <path d="M40 27 Q36 34 29 37" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M40 27 Q44 34 51 37" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M40 27 L37.5 44 L40 48 L42.5 44 Z" fill="currentColor" fill-opacity="0.38" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/>
    <path d="M29 30 L10 54" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M51 30 L70 54" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M31 58 L26 84" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M49 58 L54 84" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>`,
  dog: `<ellipse cx="35" cy="62" rx="21" ry="13" stroke="currentColor" stroke-width="2.2" fill="currentColor" fill-opacity="0.10"/>
    <circle cx="57" cy="40" r="13" stroke="currentColor" stroke-width="2.2" fill="currentColor" fill-opacity="0.10"/>
    <path d="M48 30 Q40 22 38 36" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="currentColor" fill-opacity="0.12"/>
    <circle cx="60" cy="36" r="2" fill="currentColor"/>
    <path d="M14 58 Q4 44 10 30" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M50 73 L48 89" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M40 74 L38 90" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M24 73 L21 89" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M14 70 L11 86" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>`,
  cat: `<ellipse cx="38" cy="65" rx="18" ry="13" stroke="currentColor" stroke-width="2.2" fill="currentColor" fill-opacity="0.10"/>
    <circle cx="40" cy="34" r="16" stroke="currentColor" stroke-width="2.2" fill="currentColor" fill-opacity="0.10"/>
    <path d="M28 22 L23 10 L36 20" stroke="currentColor" stroke-width="2" stroke-linejoin="round" fill="currentColor" fill-opacity="0.15"/>
    <path d="M52 22 L57 10 L44 20" stroke="currentColor" stroke-width="2" stroke-linejoin="round" fill="currentColor" fill-opacity="0.15"/>
    <ellipse cx="34" cy="32" rx="2.5" ry="3" fill="currentColor"/>
    <ellipse cx="46" cy="32" rx="2.5" ry="3" fill="currentColor"/>
    <path d="M20 65 Q8 72 10 84 Q12 92 22 88" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M30 76 L28 90" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M44 76 L46 90" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>`,
  robot: `<line x1="40" y1="6" x2="40" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <circle cx="40" cy="5" r="3" fill="currentColor"/>
    <rect x="26" y="15" width="28" height="22" rx="4" stroke="currentColor" stroke-width="2.2" fill="currentColor" fill-opacity="0.10"/>
    <rect x="30" y="20" width="7" height="6" rx="1.5" fill="currentColor" fill-opacity="0.55"/>
    <rect x="43" y="20" width="7" height="6" rx="1.5" fill="currentColor" fill-opacity="0.55"/>
    <line x1="40" y1="37" x2="40" y2="44" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <rect x="24" y="44" width="32" height="26" rx="4" stroke="currentColor" stroke-width="2.2" fill="currentColor" fill-opacity="0.10"/>
    <path d="M24 50 L13 64" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M56 50 L67 64" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M34 70 L31 88" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M46 70 L49 88" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>`,
  kid: `<circle cx="40" cy="20" r="15" stroke="currentColor" stroke-width="2.5" fill="currentColor" fill-opacity="0.13"/>
    <line x1="40" y1="35" x2="40" y2="58" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M40 43 L24 54" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M40 43 L56 54" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M40 58 L30 76" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M40 58 L50 76" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>`,
}

function CharacterCard({ variant, label }: { variant: string; label: string }) {
  const thumb = CHAR_THUMB[variant] ?? ''

  const handleDragStart = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.dataTransfer.setData('application/agentflow-node', 'character')
      event.dataTransfer.setData(
        'application/agentflow-node-config',
        JSON.stringify({ variant }),
      )
      event.dataTransfer.effectAllowed = 'copy'
    },
    [variant],
  )

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      title={label}
      className="
        flex flex-col items-center gap-1 p-2 rounded-lg
        border border-white/5 bg-gray-900/60
        hover:bg-gray-800/80 hover:border-white/15
        cursor-grab active:cursor-grabbing
        transition-all duration-150 select-none
      "
    >
      <svg
        viewBox="0 0 80 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: 36, height: 44, color: '#94a3b8' }}
        dangerouslySetInnerHTML={{ __html: thumb }}
      />
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
const SIDEBAR_STORAGE_KEY = 'agentflow.sidebar.sections'
const DEFAULT_EXPANDED: Record<string, boolean> = {
  core: true,
  data: false,
  flow: false,
  tool: false,
  output: false,
  eval: false,
  characters: false,
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

        {/* ── Characters ───────────────────────────────────────── */}
        <div>
          <CategoryHeader
            label="Characters"
            count={CHARACTER_VARIANTS.length}
            expanded={expandedSections.characters ?? false}
            onToggle={() => toggleCategory('characters')}
          />
          {(expandedSections.characters ?? false) && (
            <div className="grid grid-cols-3 gap-1.5 mt-1">
              {CHARACTER_VARIANTS.map(({ key, label }) => (
                <CharacterCard key={key} variant={key} label={label} />
              ))}
            </div>
          )}
        </div>
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
