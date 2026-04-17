import { useCallback, useEffect, useMemo, useState } from 'react'
import { getAllNodeDefinitions } from '../../lib/nodeDefinitions'
import type { NodeDefinition } from '../../types/nodes'
import { CHARACTER_VARIANTS } from '../nodes/CharacterNode'
import { useFlowStore } from '../../hooks/useFlowStore'

// ── Palette card ──────────────────────────────────────────────────────────────

interface PaletteCardProps {
  def: NodeDefinition
  isDark: boolean
}

function PaletteCard({ def, isDark }: PaletteCardProps) {
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
        rounded-lg border
        cursor-grab active:cursor-grabbing
        transition-all duration-150
        hover:shadow-md
        select-none
      "
      style={isDark
        ? { borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(17,24,39,0.6)' }
        : { borderColor: 'rgba(99,102,241,0.12)', background: 'rgba(255,255,255,0.88)' }
      }
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
        <p className={`text-[12px] font-medium leading-tight ${isDark ? 'text-white/90' : 'text-slate-800'}`}>
          {def.label}
        </p>
        <p className={`text-[10px] leading-snug mt-0.5 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
          {def.description}
        </p>
      </div>

      {/* Drag hint */}
      <div className={`shrink-0 transition-colors duration-150 ${isDark ? 'text-white/20 group-hover:text-white/40' : 'text-slate-400 group-hover:text-slate-600'}`}>
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
  isDark: boolean
}

function CategoryHeader({ label, count, expanded, onToggle, isDark }: CategoryHeaderProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-2 px-1 py-1 mt-4 mb-1 first:mt-0 rounded-md text-left transition-colors duration-150"
      style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(51,65,85,0.7)' }}
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
      <span className={`text-[10px] font-semibold uppercase tracking-widest ${isDark ? 'text-white/35' : 'text-slate-600/80'}`}>
        {label}
      </span>
      <span className={`text-[10px] tabular-nums ${isDark ? 'text-white/20' : 'text-slate-400'}`}>
        {count}
      </span>
      <div className="flex-1 h-px" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(99,102,241,0.14)' }} />
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
  woman: `<path d="M33 10 Q6 18 4 70" stroke="#a0522d" stroke-width="7" stroke-linecap="round"/>
    <path d="M35 9 Q16 24 15 72" stroke="#a0522d" stroke-width="6" stroke-linecap="round"/>
    <path d="M45 9 Q64 24 65 72" stroke="#a0522d" stroke-width="6" stroke-linecap="round"/>
    <path d="M47 10 Q74 18 76 70" stroke="#a0522d" stroke-width="7" stroke-linecap="round"/>
    <path d="M24 15 Q24 1 40 1 Q56 1 56 15" stroke="#a0522d" stroke-width="5" stroke-linecap="round" fill="none"/>
    <circle cx="40" cy="17" r="12" stroke="currentColor" stroke-width="2.5" fill="currentColor" fill-opacity="0.13"/>
    <path d="M32 29 L18 73 L62 73 L48 29 Z" stroke="#6b7db3" stroke-width="2" fill="#6b7db3" stroke-linejoin="round"/>
    <path d="M33 33 L14 53" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M47 33 L66 53" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M26 73 L22 91" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M54 73 L58 91" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>`,
  cat: `<ellipse cx="38" cy="65" rx="18" ry="13" stroke="currentColor" stroke-width="2.2" fill="currentColor" fill-opacity="0.10"/>
    <circle cx="40" cy="34" r="16" stroke="currentColor" stroke-width="2.2" fill="currentColor" fill-opacity="0.10"/>
    <path d="M28 22 L23 10 L36 20" stroke="currentColor" stroke-width="2" stroke-linejoin="round" fill="currentColor" fill-opacity="0.15"/>
    <path d="M52 22 L57 10 L44 20" stroke="currentColor" stroke-width="2" stroke-linejoin="round" fill="currentColor" fill-opacity="0.15"/>
    <ellipse cx="34" cy="32" rx="2.5" ry="3" fill="currentColor"/>
    <ellipse cx="46" cy="32" rx="2.5" ry="3" fill="currentColor"/>
    <path d="M38 39 L40 41 L42 39 Q40 43 38 39 Z" fill="currentColor"/>
    <path d="M14 37 L36 40 M13 42 L36 42" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M66 37 L44 40 M67 42 L44 42" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
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
  tiger: `<ellipse cx="40" cy="65" rx="17" ry="24" stroke="currentColor" stroke-width="2.2" fill="currentColor" fill-opacity="0.1"/>
    <path d="M24 55 L30 57 M56 55 L50 57 M24 65 L30 65 M56 65 L50 65 M25 75 L30 73 M55 75 L50 73" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M29 44 Q17 54 23 64" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <path d="M51 44 Q63 54 57 64" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <path d="M32 87 L30 93 M48 87 L50 93" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M50 80 Q65 90 60 70" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <path d="M22 9 Q16 -1 28 5 Z" stroke="currentColor" stroke-width="2.2" fill="currentColor" fill-opacity="0.12"/>
    <path d="M58 9 Q64 -1 52 5 Z" stroke="currentColor" stroke-width="2.2" fill="currentColor" fill-opacity="0.12"/>
    <circle cx="40" cy="23" r="18" stroke="currentColor" stroke-width="2.2" fill="currentColor" fill-opacity="0.1"/>
    <path d="M40 5 L40 12 M33 6 L36 10 M47 6 L44 10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M22 19 L28 21 M22 25 L28 25 M58 19 L52 21 M58 25 L52 25" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="32" cy="19" r="2.5" fill="currentColor"/>
    <circle cx="48" cy="19" r="2.5" fill="currentColor"/>
    <ellipse cx="40" cy="27" rx="7" ry="4.8" stroke="currentColor" stroke-width="1.6" fill="currentColor" fill-opacity="0.12"/>
    <path d="M37.8 25.8 L40 28.3 L42.2 25.8 Z" fill="currentColor"/>
    <path d="M35 28.5 L20 26.5 M34.5 30 L17 30 M35 31.5 L20 33.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M45 28.5 L60 26.5 M45.5 30 L63 30 M45 31.5 L60 33.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>`,
  bear: `<circle cx="24" cy="18" r="6.6" stroke="currentColor" stroke-width="2.2" fill="currentColor" fill-opacity="0.12"/>
    <circle cx="56" cy="18" r="6.6" stroke="currentColor" stroke-width="2.2" fill="currentColor" fill-opacity="0.12"/>
    <circle cx="24" cy="18" r="2.4" fill="currentColor" fill-opacity="0.2"/>
    <circle cx="56" cy="18" r="2.4" fill="currentColor" fill-opacity="0.2"/>
    <circle cx="40" cy="34" r="18" stroke="currentColor" stroke-width="2.2" fill="currentColor" fill-opacity="0.1"/>
    <circle cx="32" cy="30" r="2.1" fill="currentColor"/>
    <circle cx="48" cy="30" r="2.1" fill="currentColor"/>
    <ellipse cx="40" cy="38" rx="8" ry="5.6" stroke="currentColor" stroke-width="1.6" fill="currentColor" fill-opacity="0.12"/>
    <ellipse cx="40" cy="37" rx="3.1" ry="2.1" fill="currentColor"/>
    <ellipse cx="40" cy="72" rx="22" ry="20" stroke="currentColor" stroke-width="2.2" fill="currentColor" fill-opacity="0.1"/>
    <ellipse cx="40" cy="74" rx="12" ry="14" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.05"/>
    <path d="M22 60 Q12 70 16 80" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
    <path d="M58 60 Q68 70 64 80" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
    <path d="M30 90 L28 96" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>
    <path d="M50 90 L52 96" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>`,
}

function CharacterCard({ variant, label, isDark }: { variant: string; label: string; isDark: boolean }) {
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
        cursor-grab active:cursor-grabbing
        transition-all duration-150 select-none
      "
      style={isDark
        ? { borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(17,24,39,0.6)' }
        : { borderColor: 'rgba(99,102,241,0.12)', background: 'rgba(255,255,255,0.88)' }
      }
    >
      <svg
        viewBox="0 0 80 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: 36, height: 44, color: isDark ? '#94a3b8' : '#475569' }}
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
  integration: 'Integrations',
}

const CATEGORY_ORDER = ['core', 'data', 'flow', 'tool', 'output', 'eval', 'integration']
const SIDEBAR_STORAGE_KEY = 'agentflow.sidebar.sections'
const DEFAULT_EXPANDED: Record<string, boolean> = {
  core: true,
  data: false,
  flow: false,
  tool: false,
  output: false,
  eval: false,
  integration: false,
  characters: false,
}

export default function Sidebar() {
  const defs = getAllNodeDefinitions()
  const theme = useFlowStore((s) => s.theme)
  const isDark = theme === 'dark'
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
      className="w-56 h-full flex flex-col shrink-0 backdrop-blur-sm"
      style={{
        background: isDark ? 'rgba(3,7,18,0.9)' : 'rgba(248,250,255,0.88)',
        borderRight: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(99,102,241,0.14)',
      }}
    >
      {/* Header */}
      <div className="px-4 py-3" style={{ borderBottom: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(99,102,241,0.14)' }}>
        <p className={`text-[11px] font-semibold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-slate-600'}`}>
          Node Palette
        </p>
        <p className={`text-[10px] mt-0.5 ${isDark ? 'text-white/25' : 'text-slate-500'}`}>
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
              isDark={isDark}
            />
            {(expandedSections[cat] ?? DEFAULT_EXPANDED[cat] ?? true) && (
              <div className="space-y-1">
                {items.map((def) => (
                  <PaletteCard key={def.type} def={def} isDark={isDark} />
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
            isDark={isDark}
          />
          {(expandedSections.characters ?? false) && (
            <div className="grid grid-cols-3 gap-1.5 mt-1">
              {CHARACTER_VARIANTS.map(({ key, label }) => (
                <CharacterCard key={key} variant={key} label={label} isDark={isDark} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer hint */}
      <div className="px-4 py-2.5" style={{ borderTop: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(99,102,241,0.14)' }}>
        <p className={`text-[10px] text-center ${isDark ? 'text-white/20' : 'text-slate-500'}`}>
          {defs.length} node types
        </p>
      </div>
    </aside>
  )
}
