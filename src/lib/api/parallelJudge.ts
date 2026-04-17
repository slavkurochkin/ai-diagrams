import type { WorkflowProvider } from './workflowBuild'

interface SerializedNode {
  id: string
  nodeType: string
  label: string
  description?: string
  config: Record<string, unknown>
}

interface SerializedEdge {
  id: string
  source: string
  sourceHandle: string | null
  target: string
  targetHandle: string | null
}

export interface JudgeCandidateInput {
  id: string
  label: string
  nodes: SerializedNode[]
  edges: SerializedEdge[]
  assistantSummary?: string
}

export interface JudgeDecision {
  winnerId: string
  overallReasoning: string
  scores: Array<{
    designId: string
    score: number
    reasoning: string
  }>
}

export interface ParallelJudgeResponse {
  provider: WorkflowProvider
  model: string
  decision: JudgeDecision
}

export async function runParallelJudge(
  provider: WorkflowProvider,
  prompt: string,
  candidates: JudgeCandidateInput[],
): Promise<ParallelJudgeResponse> {
  const response = await fetch('/api/parallel-judge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider,
      prompt,
      candidates,
    }),
  })

  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error ?? `parallel-judge failed: ${response.status}`)
  }
  return response.json() as Promise<ParallelJudgeResponse>
}

