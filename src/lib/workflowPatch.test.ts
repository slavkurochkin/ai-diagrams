import { describe, expect, it } from 'vitest'
import { resolveEdgeHandles, validateWorkflowPatches, type SerializedNode } from './workflowPatch'

const node = (id: string, nodeType: string, config: Record<string, unknown> = {}): SerializedNode => ({
  id,
  nodeType,
  label: id,
  config,
})

describe('resolveEdgeHandles', () => {
  it('fills omitted handles with sensible defaults', () => {
    expect(resolveEdgeHandles('trigger', 'subAgent', null, null)).toEqual({ ok: true, sourceHandle: 'payload', targetHandle: 'task' })
    expect(resolveEdgeHandles('agent', 'mcpServer', null, null)).toEqual({ ok: true, sourceHandle: 'toolRequests', targetHandle: 'call' })
    expect(resolveEdgeHandles('humanApproval', 'output', null, null)).toEqual({ ok: true, sourceHandle: 'approved', targetHandle: 'input' })
  })

  it('falls back to a type-compatible port when the first choice does not fit', () => {
    // First choice would be llm.response (text) → gate.score (structured).
    expect(resolveEdgeHandles('llm', 'thresholdGate', null, null)).toEqual({ ok: true, sourceHandle: 'structured', targetHandle: 'score' })
    // Explicit target kept; source adjusted to fit it.
    expect(resolveEdgeHandles('llm', 'thresholdGate', null, 'score')).toEqual({ ok: true, sourceHandle: 'structured', targetHandle: 'score' })
  })

  it('rejects explicit handles whose types do not fit', () => {
    const r = resolveEdgeHandles('llm', 'thresholdGate', 'response', 'score')
    expect(r).toEqual({ ok: false, error: 'incompatible ports: llm.response (text) → thresholdGate.score (structured)' })
  })

  it('wires state and monitor nodes by default and refuses edges on tracing', () => {
    expect(resolveEdgeHandles('trigger', 'state', null, null)).toEqual({ ok: true, sourceHandle: 'payload', targetHandle: 'write' })
    expect(resolveEdgeHandles('agentEfficiency', 'monitor', null, null)).toEqual({ ok: true, sourceHandle: 'metrics', targetHandle: 'metrics' })
    expect(resolveEdgeHandles('monitor', 'output', null, null)).toEqual({ ok: true, sourceHandle: 'alert', targetHandle: 'input' })
    expect(resolveEdgeHandles('llm', 'tracing', null, null)).toEqual({ ok: false, error: 'target type "tracing" has no inputs' })
    expect(resolveEdgeHandles('tracing', 'llm', null, null)).toEqual({ ok: false, error: 'source type "tracing" has no outputs' })
  })

  it('uses node config for dynamic ports', () => {
    expect(resolveEdgeHandles('router', 'llm', 'routeC', null, { routeCount: 2 }).ok).toBe(false)
    expect(resolveEdgeHandles('router', 'llm', 'routeC', null, { routeCount: 3 })).toEqual({ ok: true, sourceHandle: 'routeC', targetHandle: 'prompt' })
  })
})

describe('validateWorkflowPatches', () => {
  it('accepts a batch using new nodes and a three-route router', () => {
    const existing = [node('old-llm', 'llm', { model: 'gpt-4o' })]
    const { validPatches, errors } = validateWorkflowPatches(
      [
        { op: 'addNode', id: 'in', nodeType: 'trigger', label: 'Ticket', config: { triggerType: 'webhook' } },
        { op: 'addNode', id: 'r', nodeType: 'router', label: 'Triage', config: { routeCount: 3 } },
        { op: 'addNode', id: 'out', nodeType: 'output', label: 'Reply' },
        { op: 'addEdge', id: 'e1', source: 'in', target: 'r' },
        { op: 'addEdge', id: 'e2', source: 'r', target: 'old-llm', sourceHandle: 'routeC' },
        { op: 'addEdge', id: 'e3', source: 'old-llm', target: 'out' },
        // Saved with a retired model id — must still validate.
        { op: 'setNodeConfig', nodeId: 'old-llm', config: { effort: 'low' } },
      ],
      existing,
    )
    expect(errors).toEqual([])
    expect(validPatches).toHaveLength(7)
  })

  it('rejects an edge to a route the router does not have', () => {
    const { errors } = validateWorkflowPatches(
      [
        { op: 'addNode', id: 'r', nodeType: 'router', label: 'R' },
        { op: 'addNode', id: 'l', nodeType: 'llm', label: 'L' },
        { op: 'addEdge', id: 'e', source: 'r', target: 'l', sourceHandle: 'routeC', targetHandle: 'prompt' },
      ],
      [],
    )
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('routeC')
  })

  it('rejects an explicitly incompatible edge from the AI', () => {
    const { validPatches, errors } = validateWorkflowPatches(
      [{ op: 'addEdge', id: 'e', source: 'retriever', target: 'gate', sourceHandle: 'documents', targetHandle: 'score' }],
      [node('retriever', 'retriever'), node('gate', 'thresholdGate')],
    )
    expect(validPatches).toEqual([])
    expect(errors[0]).toContain('incompatible ports: retriever.documents (text) → thresholdGate.score (structured)')
  })
})
