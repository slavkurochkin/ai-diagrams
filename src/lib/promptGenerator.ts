import type { Node, Edge } from 'reactflow'
import type { BaseNodeData } from '../types/nodes'
import type { FlowContext } from '../types/flow'
import { getNodeDefinition } from './nodeDefinitions'

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
  const contentNodes = nodes.filter((n) => n.type !== 'frame' && n.type !== 'text')
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
  const contentEdges = edges.filter(
    (e) => nodeById.has(e.source) && nodeById.has(e.target),
  )

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
