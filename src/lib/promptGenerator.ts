import type { Node, Edge } from 'reactflow'
import type { BaseNodeData } from '../types/nodes'
import type { FlowContext } from '../types/flow'
import { getNodeDefinition } from './nodeDefinitions'
import { filterGraphForAI } from './aiGraphFilter'
import { serializeFlowToYAML } from './yamlFlow'

function cellForMarkdownTable(s: string): string {
  return s.replace(/\s+/g, ' ').replace(/\|/g, '·').trim()
}

function edgeLabel(e: Edge): string {
  const from = e.sourceHandle ? `[${e.sourceHandle}]` : ''
  const to   = e.targetHandle ? `[${e.targetHandle}]` : ''
  return [from, '→', to].filter(Boolean).join(' ')
}

function configLines(config: Record<string, string | number | boolean> | undefined): string {
  if (!config || Object.keys(config).length === 0) return ''
  const lines = Object.entries(config)
    .filter(([, v]) => v !== '' && v !== null && v !== undefined)
    .map(([k, v]) => `  - ${k}: ${v}`)
  return lines.length ? lines.join('\n') : ''
}

function coerceNumber(v: unknown, fallback: number): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const parsed = Number(v)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

interface FrameGroup {
  id: string
  title: string
  left: number
  top: number
  right: number
  bottom: number
  memberIds: string[]
}

function buildFrameGroups(
  nodes: Node<BaseNodeData>[],
  contentNodeIds: Set<string>,
): FrameGroup[] {
  const frameNodes = nodes.filter((n) => n.type === 'frame')
  const regularNodes = nodes.filter((n) => n.type !== 'frame')

  const groups: FrameGroup[] = []
  for (const frame of frameNodes) {
    const width = coerceNumber(frame.style?.width, coerceNumber(frame.data.config?.width, 420))
    const height = coerceNumber(frame.style?.height, coerceNumber(frame.data.config?.height, 260))
    const titleRaw = frame.data.config?.title
    const title = typeof titleRaw === 'string' && titleRaw.trim() ? titleRaw.trim() : 'Section'

    const left = frame.position.x
    const top = frame.position.y
    const right = left + Math.max(1, width)
    const bottom = top + Math.max(1, height)

    const memberIds = regularNodes
      .filter((n) => {
        if (!contentNodeIds.has(n.id)) return false
        const nx = n.position.x
        const ny = n.position.y
        return nx >= left && nx <= right && ny >= top && ny <= bottom
      })
      .map((n) => n.id)

    if (memberIds.length === 0) continue
    groups.push({ id: frame.id, title, left, top, right, bottom, memberIds })
  }

  return groups
}

function appendTaskDecompositionAppendix(
  lines: string[],
  groups: FrameGroup[],
  contentNodes: Node<BaseNodeData>[],
  contentEdges: Edge[],
): void {
  lines.push('---')
  lines.push('')
  lines.push('## Appendix B — Task decomposition by frame')
  lines.push('')

  if (groups.length === 0) {
    lines.push('_No frame groups detected with AI pipeline nodes inside._')
    lines.push('')
    return
  }

  const nodeById = new Map(contentNodes.map((n) => [n.id, n]))
  const labelFor = (id: string): string => {
    const n = nodeById.get(id)
    if (!n) return id
    const def = getNodeDefinition(n.data.nodeType)
    return n.data.label ?? def?.label ?? n.data.nodeType
  }

  groups.forEach((group, idx) => {
    lines.push(`### ${idx + 1}. ${group.title} (\`${group.id}\`)`)
    lines.push('')

    const memberSet = new Set(group.memberIds)
    const inbound = contentEdges.filter((e) => !memberSet.has(e.source) && memberSet.has(e.target))
    const outbound = contentEdges.filter((e) => memberSet.has(e.source) && !memberSet.has(e.target))

    lines.push('**Nodes in this slice:**')
    for (const id of group.memberIds) {
      const node = nodeById.get(id)
      if (!node) continue
      lines.push(`- \`${id}\` — **${labelFor(id)}** (\`${node.data.nodeType}\`)`)
    }

    lines.push('')
    lines.push('**Inbound contracts (inputs to this slice):**')
    if (inbound.length === 0) {
      lines.push('- None')
    } else {
      for (const e of inbound) {
        const connector = edgeLabel(e)
        lines.push(
          `- **${labelFor(e.source)}** (\`${e.source}\`) → **${labelFor(e.target)}** (\`${e.target}\`)${connector ? `  \`${connector}\`` : ''}`,
        )
      }
    }

    lines.push('')
    lines.push('**Outbound contracts (outputs from this slice):**')
    if (outbound.length === 0) {
      lines.push('- None')
    } else {
      for (const e of outbound) {
        const connector = edgeLabel(e)
        lines.push(
          `- **${labelFor(e.source)}** (\`${e.source}\`) → **${labelFor(e.target)}** (\`${e.target}\`)${connector ? `  \`${connector}\`` : ''}`,
        )
      }
    }

    lines.push('')
  })
}

/**
 * Generates a structured implementation brief that a coding agent (e.g. Claude)
 * can use to build the described AI pipeline from scratch.
 */
export function generateImplementationPrompt(
  flowName: string,
  nodes: Node<BaseNodeData>[],
  edges: Edge[],
  flowContext: FlowContext | null,
): string {
  const { nodes: contentNodes, edges: contentEdges } = filterGraphForAI(nodes, edges)
  const nodeById = new Map(contentNodes.map((n) => [n.id, n]))

  const lines: string[] = []

  // ── Header ──────────────────────────────────────────────────────────────────
  lines.push(`# ${flowName} — Implementation Brief`)
  lines.push('')
  lines.push(
    'This document is a complete specification for building the AI agent pipeline described below. ' +
    'Implement every component exactly as specified, preserve all data-flow connections, ' +
    'and respect the configuration values. Do not add components that are not listed.',
  )
  lines.push('')

  // ── Purpose ─────────────────────────────────────────────────────────────────
  if (flowContext?.description) {
    lines.push('---')
    lines.push('')
    lines.push('## Purpose')
    lines.push('')
    lines.push(flowContext.description.trim())
    lines.push('')
  }

  // ── Architecture ─────────────────────────────────────────────────────────────
  if (flowContext?.howItWorks) {
    lines.push('---')
    lines.push('')
    lines.push('## How It Works')
    lines.push('')
    lines.push(flowContext.howItWorks.trim())
    lines.push('')
  }

  // ── Components ───────────────────────────────────────────────────────────────
  if (contentNodes.length > 0) {
    lines.push('---')
    lines.push('')
    lines.push('## Components')
    lines.push('')
    lines.push('Implement each component below in the order listed. The number corresponds to its position in the pipeline.')
    lines.push('')

    contentNodes.forEach((node, idx) => {
      const def = getNodeDefinition(node.data.nodeType)
      const label = node.data.label ?? def?.label ?? node.data.nodeType

      lines.push(`### ${idx + 1}. ${label}`)
      lines.push('')
      if (def?.description) {
        lines.push(`**Type:** \`${node.data.nodeType}\` — ${def.description}`)
      } else {
        lines.push(`**Type:** \`${node.data.nodeType}\``)
      }

      const instDesc =
        typeof node.data.description === 'string' ? node.data.description.trim() : ''
      if (instDesc) {
        lines.push('')
        lines.push(`**In this diagram:** ${instDesc}`)
      }

      const cfgStr = configLines(node.data.config as Record<string, string | number | boolean> | undefined)
      if (cfgStr) {
        lines.push('')
        lines.push('**Configuration:**')
        lines.push(cfgStr)
      }

      if (def?.inputs && def.inputs.length > 0) {
        lines.push('')
        lines.push(`**Inputs:** ${def.inputs.map((p) => p.label).join(', ')}`)
      }
      if (def?.outputs && def.outputs.length > 0) {
        lines.push(`**Outputs:** ${def.outputs.map((p) => p.label).join(', ')}`)
      }

      if (node.data.note) {
        lines.push('')
        lines.push('**Implementation note:**')
        lines.push(node.data.note.trim())
      }

      lines.push('')
    })
  }

  // ── Data Flow ────────────────────────────────────────────────────────────────
  if (contentEdges.length > 0) {
    lines.push('---')
    lines.push('')
    lines.push('## Data Flow')
    lines.push('')
    lines.push('Wire these connections exactly. Handle IDs specify which output/input port to use.')
    lines.push('')

    // Group loopbacks separately
    const forwardEdges  = contentEdges.filter((e) => e.data?.kind !== 'loopback')
    const loopbackEdges = contentEdges.filter((e) => e.data?.kind === 'loopback')

    forwardEdges.forEach((e) => {
      const srcLabel = nodeById.get(e.source)?.data.label ?? e.source
      const tgtLabel = nodeById.get(e.target)?.data.label ?? e.target
      const connector = edgeLabel(e)
      const priority = typeof e.data?.executionPriority === 'number' && e.data.executionPriority > 1
        ? ` (priority ${e.data.executionPriority})`
        : ''
      lines.push(`- **${srcLabel}** → **${tgtLabel}**${connector ? `  \`${connector}\`` : ''}${priority}`)
    })

    if (loopbackEdges.length > 0) {
      lines.push('')
      lines.push('**Loopback connections** (feedback / retry paths):')
      loopbackEdges.forEach((e) => {
        const srcLabel = nodeById.get(e.source)?.data.label ?? e.source
        const tgtLabel = nodeById.get(e.target)?.data.label ?? e.target
        const lane = e.data?.lane ? ` via ${e.data.lane} lane` : ''
        lines.push(`- **${srcLabel}** ↩ **${tgtLabel}**${lane}`)
      })
    }

    lines.push('')
  }

  // ── Business Documents ───────────────────────────────────────────────────────
  if (flowContext?.documents && flowContext.documents.length > 0) {
    lines.push('---')
    lines.push('')
    lines.push('## Business Context & Constraints')
    lines.push('')
    lines.push('The following documents define rules, policies, and domain knowledge the pipeline must respect.')
    lines.push('')

    for (const doc of flowContext.documents) {
      if (!doc.content.trim()) continue
      lines.push(`### ${doc.name || 'Document'}`)
      lines.push('')
      lines.push(doc.content.trim())
      lines.push('')
    }
  }

  // ── Implementation Guidelines ────────────────────────────────────────────────
  lines.push('---')
  lines.push('')
  lines.push('## Implementation Requirements')
  lines.push('')
  lines.push('- **Fidelity**: implement every component listed above — no additions, no omissions.')
  lines.push('- **Connections**: wire all data-flow edges exactly as specified, using the correct handle IDs.')
  lines.push('- **Configuration**: use the exact values from each component\'s Configuration section.')
  lines.push('- **Execution order**: respect the data-flow direction; parallel branches may run concurrently.')
  lines.push('- **Loopbacks**: implement feedback paths as retry/loop logic triggered by the source component.')
  lines.push('- **Business rules**: enforce all constraints in the Business Context section throughout the pipeline.')
  lines.push('- **Notes**: treat each component\'s "Implementation note" as binding architectural guidance.')

  return lines.join('\n')
}

/**
 * Safe filename for a downloaded Markdown pack (ASCII, no path separators).
 */
export function codingAgentMarkdownFilename(flowName: string): string {
  const base =
    flowName
      .trim()
      .replace(/[/\\?%*:|"<>]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || 'flow'
  return `${base}-coding-agent.md`
}

/**
 * Full Markdown handoff for coding agents: implementation brief, node ID table, and YAML appendix.
 */
export function generateCodingAgentMarkdownPack(
  flowName: string,
  nodes: Node<BaseNodeData>[],
  edges: Edge[],
  flowContext: FlowContext | null,
  layoutDirection: 'TB' | 'LR',
): string {
  const brief = generateImplementationPrompt(flowName, nodes, edges, flowContext)

  const { nodes: contentNodes, edges: contentEdges } = filterGraphForAI(nodes, edges)
  const contentNodeIds = new Set(contentNodes.map((n) => n.id))
  const frameGroups = buildFrameGroups(nodes, contentNodeIds)
  const tableLines: string[] = []
  tableLines.push('---')
  tableLines.push('')
  tableLines.push('## Appendix A — Node ID map (for YAML and APIs)')
  tableLines.push('')
  if (contentNodes.length === 0) {
    tableLines.push(
      '_No AI pipeline nodes on the canvas (only presentation nodes such as frames or characters, or an empty diagram)._',
    )
    tableLines.push('')
  } else {
    tableLines.push('| Node ID | Type | Label | Description (excerpt) |')
    tableLines.push('| --- | --- | --- | --- |')
    for (const n of contentNodes) {
      const def = getNodeDefinition(n.data.nodeType)
      const labelRaw = n.data.label ?? def?.label ?? n.data.nodeType
      const desc = typeof n.data.description === 'string' ? n.data.description.trim() : ''
      const excerpt = desc.length > 120 ? `${desc.slice(0, 117)}...` : desc
      tableLines.push(
        `| \`${n.id}\` | \`${n.data.nodeType}\` | ${cellForMarkdownTable(labelRaw)} | ${cellForMarkdownTable(excerpt) || '—'} |`,
      )
    }
    tableLines.push('')
  }

  const decompositionLines: string[] = []
  appendTaskDecompositionAppendix(
    decompositionLines,
    frameGroups,
    contentNodes,
    contentEdges,
  )

  const yaml = serializeFlowToYAML(flowName, nodes, edges, layoutDirection)
  const yamlBlock = [
    '---',
    '',
    '## Appendix C — Diagram YAML (machine-readable)',
    '',
    '```yaml',
    yaml.trimEnd(),
    '```',
    '',
  ].join('\n')

  const preamble = [
    '# Coding agent export',
    '',
    `**Flow:** ${flowName}`,
    '',
    'Use this document as a single handoff. The **Implementation Brief** is the primary specification; **Appendix A** maps stable node IDs to labels; **Appendix B** captures task decomposition from frame groups; **Appendix C** can recreate the diagram in this editor.',
    '',
    '---',
    '',
  ].join('\n')

  return preamble + brief + '\n' + tableLines.join('\n') + decompositionLines.join('\n') + yamlBlock
}
