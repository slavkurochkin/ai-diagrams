import type {
  ConfigField,
  NodeDefinition,
  PortDefinition,
  PortType,
  SelectOption,
} from '../types/nodes'
import { getAllNodeDefinitions } from './nodeDefinitions'

// ── JSON-serializable projection (no React icon) ─────────────────────────────

export interface PortDefinitionForAI {
  id: string
  label: string
  type: PortType
  color?: string
  edgeOffsetPercent?: number
}

export interface ConfigFieldForAI {
  key: string
  label: string
  type: ConfigField['type']
  defaultValue: string | number | boolean
  placeholder?: string
  options?: SelectOption[]
  min?: number
  max?: number
  step?: number
  description?: string
  visibleWhen?: { key: string; value: string | number | boolean }
}

export interface NodeDefinitionForAI {
  type: string
  label: string
  description: string
  category: NodeDefinition['category']
  inputs: PortDefinitionForAI[]
  outputs: PortDefinitionForAI[]
  configFields: ConfigFieldForAI[]
}

function projectPort(p: PortDefinition): PortDefinitionForAI {
  const { id, label, type, color, edgeOffsetPercent } = p
  return { id, label, type, ...(color !== undefined && { color }), ...(edgeOffsetPercent !== undefined && { edgeOffsetPercent }) }
}

function projectConfigField(f: ConfigField): ConfigFieldForAI {
  return {
    key: f.key,
    label: f.label,
    type: f.type,
    defaultValue: f.defaultValue,
    ...(f.placeholder !== undefined && { placeholder: f.placeholder }),
    ...(f.options !== undefined && { options: f.options }),
    ...(f.min !== undefined && { min: f.min }),
    ...(f.max !== undefined && { max: f.max }),
    ...(f.step !== undefined && { step: f.step }),
    ...(f.description !== undefined && { description: f.description }),
    ...(f.visibleWhen !== undefined && { visibleWhen: f.visibleWhen }),
  }
}

/** Full catalog as JSON-safe objects (icons stripped). */
export function getNodeCatalogForAI(): NodeDefinitionForAI[] {
  return getAllNodeDefinitions().map((def) => ({
    type: def.type,
    label: def.label,
    description: def.description,
    category: def.category,
    inputs: def.inputs.map(projectPort),
    outputs: def.outputs.map(projectPort),
    configFields: def.configFields.map(projectConfigField),
  }))
}

const CATEGORY_ORDER: NodeDefinition['category'][] = [
  'core',
  'data',
  'flow',
  'tool',
  'output',
  'eval',
  'character',
]

const CATEGORY_HEADINGS: Record<NodeDefinition['category'], string> = {
  core: 'CORE',
  data: 'DATA & RETRIEVAL',
  flow: 'ROUTING & CONTROL',
  tool: 'TOOLS & EXTERNAL',
  output: 'OUTPUT & SAFETY',
  eval: 'EVALUATION',
  character: 'CHARACTERS',
}

function padTypeColumn(types: string[]): number {
  return Math.max(15, ...types.map((t) => t.length))
}

/** Markdown block grouped by category (for system prompts). */
export function formatFullNodeCatalogMarkdown(): string {
  const defs = getAllNodeDefinitions()
  const byCat = new Map<NodeDefinition['category'], NodeDefinition[]>()
  for (const d of defs) {
    const list = byCat.get(d.category) ?? []
    list.push(d)
    byCat.set(d.category, list)
  }

  const lines: string[] = []
  for (const cat of CATEGORY_ORDER) {
    const list = byCat.get(cat)
    if (!list?.length) continue
    const col = padTypeColumn(list.map((d) => d.type))
    lines.push(CATEGORY_HEADINGS[cat])
    for (const d of list) {
      lines.push(`  ${d.type.padEnd(col)} — ${d.description}`)
    }
    lines.push('')
  }
  return lines.join('\n').trim()
}

/** Eval-focused nodes for eval-suggestions prompts (eval category + top-level evaluator). */
export function getEvalNodeDefinitionsForAI(): NodeDefinitionForAI[] {
  return getNodeCatalogForAI().filter((d) => d.category === 'eval' || d.type === 'evaluator')
}

export function formatEvalNodeCatalogMarkdown(): string {
  const defs = getEvalNodeDefinitionsForAI()
  if (defs.length === 0) return ''
  const col = padTypeColumn(defs.map((d) => d.type))
  return defs
    .map((d) => `  ${d.type.padEnd(col)} — ${d.description}`)
    .join('\n')
}
