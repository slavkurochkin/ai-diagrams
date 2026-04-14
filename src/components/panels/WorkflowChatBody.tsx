import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useReactFlow } from 'reactflow'
import { Loader2, Send, Wand2, AlertTriangle, X, CheckSquare } from 'lucide-react'
import { useFlowStore } from '../../hooks/useFlowStore'
import { applyWorkflowPatchesToFlow } from '../../lib/applyWorkflowPatches'
import {
  serializeFlowForWorkflowApi,
  workflowBuildChat,
  type WorkflowBuildMessage,
} from '../../lib/api/workflowBuild'
import { generateDesignReview } from '../../lib/api/designReview'

interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
  validationErrors?: string[]
  appliedPatches?: number
  kind?: 'builder' | 'reviewer' | 'system'
}

interface ReviewSuggestion {
  id: string
  text: string
  selected: boolean
}

const ARCHITECT_REFINE_TEMPLATE = `You are refactoring the CURRENT graph, not rebuilding from scratch.

Goal:
Design a production-ready AI agent workflow with:
1) A lean online/runtime path
2) Clear control logic (routing, gating, fallbacks)
3) Evaluation/QA separated from core runtime where possible

Context:
- This workflow may be RAG, tool-using, automation, classifier/router, multi-agent, or hybrid.
- Adapt recommendations to the existing graph type instead of forcing a RAG pattern.

Constraints:
- Preserve existing good components and configs unless they conflict with goals.
- Prefer targeted edits (addEdge/removeEdge/setNodeConfig/removeNode/addNode only when needed).
- Keep node count minimal and avoid redundant branches.
- Make decision logic deterministic and explainable.
- Do not merge uncertain/untrusted paths blindly without a gate.

Required architecture outcomes:

A) Runtime path clarity:
- Identify and enforce one primary runtime path from input to final output.
- Keep runtime latency-sensitive; move heavy/optional checks out when possible.

B) Explicit routing + fallback behavior:
- Add/clarify router/classifier conditions and branch intent.
- Define when fallback paths are triggered vs skipped.
- Ensure each fallback path has a clear return path or terminal behavior.

C) Evaluation strategy:
- If eval nodes exist, separate runtime-critical flow from evaluation/analysis flow when possible.
- Keep essential runtime guardrails, but avoid unnecessary runtime eval latency.

D) Failure handling:
- Add explicit handling for key failure modes relevant to this graph type
  (e.g. empty inputs/results, tool failure, low confidence, policy violation, parser failure).
- Define outcome per failure path (retry, fallback, block, human handoff, or safe response).

E) Observability hooks:
- Ensure flow exposes where to capture key metrics/signals for this architecture
  (quality, latency, cost, failure rate, and branch usage).

Output format:
1) Brief architecture summary (5-8 bullets max)
2) Exact patch operations to apply
3) Final checklist:
   - runtime path clear and lean
   - routing/fallback logic explicit
   - eval strategy appropriate
   - failure modes covered
   - observability points identified`

export interface WorkflowChatBodyProps {
  /** When true, omit top header (parent panel supplies title). */
  embedded?: boolean
  /** Standalone aside: show header row with close. */
  showHeader?: boolean
  onClose?: () => void
  /** For parent header spinner (e.g. Explain panel). */
  onBusyChange?: (busy: boolean) => void
  /** Open Flow Context modal with mapped draft from reviewer text. */
  onUseReviewInContext?: (draft: { description: string; howItWorks: string }) => void
}

export default function WorkflowChatBody({
  embedded = false,
  showHeader = true,
  onClose,
  onBusyChange,
  onUseReviewInContext,
}: WorkflowChatBodyProps) {
  const theme = useFlowStore((s) => s.theme)
  const nodes = useFlowStore((s) => s.nodes)
  const edges = useFlowStore((s) => s.edges)
  const flowName = useFlowStore((s) => s.flowName)
  const flowContext = useFlowStore((s) => s.flowContext)
  const { fitView } = useReactFlow()

  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [improving, setImproving] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<ReviewSuggestion[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  const isDark = theme === 'dark'

  useEffect(() => {
    onBusyChange?.(loading || reviewing || improving)
  }, [loading, reviewing, improving, onBusyChange])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [turns, loading])

  const handleSend = useCallback(async () => {
    const text = draft.trim()
    if (!text || loading || reviewing || improving) return

    setDraft('')
    setRequestError(null)
    const nextTurns: ChatTurn[] = [...turns, { role: 'user', content: text }]
    setTurns(nextTurns)
    setLoading(true)

    const apiMessages: WorkflowBuildMessage[] = nextTurns.map((t) => ({
      role: t.role,
      content: t.content,
    }))

    try {
      const { nodes: sn, edges: se } = serializeFlowForWorkflowApi(nodes, edges)
      const res = await workflowBuildChat(apiMessages, {
        nodes: sn,
        edges: se,
        flowName,
        flowContext,
      })

      const assistantText = res.content?.trim() || '(No text reply.)'
      const applied = res.validatedPatches?.length ?? 0
      if (applied > 0) {
        applyWorkflowPatchesToFlow(res.validatedPatches)
        window.requestAnimationFrame(() => {
          fitView({ padding: 0.2, duration: 280 })
        })
      }

      setTurns((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: assistantText,
          validationErrors:
            res.validationErrors?.length ? res.validationErrors : undefined,
          appliedPatches: applied > 0 ? applied : undefined,
          kind: 'builder',
        },
      ])
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Request failed'
      setRequestError(msg)
      setTurns((prev) => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }, [draft, loading, reviewing, improving, turns, nodes, edges, flowName, flowContext, fitView])

  const extractSuggestions = useCallback((review: string): ReviewSuggestion[] => {
    const lines = review
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    const picked: string[] = []
    for (const line of lines) {
      if (line.startsWith('#')) continue
      const bullet = line.match(/^[-*]\s+(.+)/)
      const numbered = line.match(/^\d+\.\s+(.+)/)
      const text = bullet?.[1] ?? numbered?.[1]
      if (!text) continue
      if (text.length < 16) continue
      if (picked.includes(text)) continue
      picked.push(text)
      if (picked.length >= 8) break
    }
    return picked.map((text, i) => ({
      id: `s-${Date.now()}-${i}`,
      text,
      selected: false,
    }))
  }, [])

  const callBuilderOnce = useCallback(async (localTurns: ChatTurn[]) => {
    const latest = useFlowStore.getState()
    const apiMessages: WorkflowBuildMessage[] = localTurns.map((t) => ({
      role: t.role,
      content: t.content,
    }))
    const { nodes: sn, edges: se } = serializeFlowForWorkflowApi(latest.nodes, latest.edges)
    const res = await workflowBuildChat(apiMessages, {
      nodes: sn,
      edges: se,
      flowName: latest.flowName,
      flowContext: latest.flowContext ?? null,
    })

    const applied = res.validatedPatches?.length ?? 0
    if (applied > 0) {
      applyWorkflowPatchesToFlow(res.validatedPatches)
      window.requestAnimationFrame(() => {
        fitView({ padding: 0.2, duration: 280 })
      })
    }

    const builderTurn: ChatTurn = {
      role: 'assistant',
      kind: 'builder',
      content: res.content?.trim() || 'Builder update completed.',
      validationErrors: res.validationErrors?.length ? res.validationErrors : undefined,
      appliedPatches: applied > 0 ? applied : undefined,
    }
    return builderTurn
  }, [fitView])

  const handleReviewOnly = useCallback(async () => {
    if (loading || reviewing || improving) return
    setRequestError(null)
    setReviewing(true)
    try {
      const latest = useFlowStore.getState()
      const review = await generateDesignReview(
        latest.nodes,
        latest.edges,
        latest.flowName,
        latest.flowContext,
      )
      const reviewTurn: ChatTurn = {
        role: 'assistant',
        kind: 'reviewer',
        content: `Reviewer\n\n${review || 'No review output.'}`,
      }
      setTurns((prev) => [...prev, reviewTurn])
      setSuggestions(extractSuggestions(review))
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Review failed'
      setRequestError(msg)
    } finally {
      setReviewing(false)
    }
  }, [loading, reviewing, improving, extractSuggestions])

  const toggleSuggestion = useCallback((id: string) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s)),
    )
  }, [])

  const toggleAllSuggestions = useCallback(() => {
    setSuggestions((prev) => {
      const allSelected = prev.length > 0 && prev.every((s) => s.selected)
      return prev.map((s) => ({ ...s, selected: !allSelected }))
    })
  }, [])

  const handleImproveSelected = useCallback(async () => {
    if (loading || reviewing || improving) return
    const selected = suggestions.filter((s) => s.selected)
    if (selected.length === 0) {
      setRequestError('Select at least one review suggestion first.')
      return
    }
    setRequestError(null)
    setImproving(true)
    try {
      const instruction: ChatTurn = {
        role: 'user',
        kind: 'system',
        content:
          'Apply ONLY these approved review suggestions as targeted graph edits.\n' +
          selected.map((s, i) => `${i + 1}. ${s.text}`).join('\n') +
          '\nDo not apply unselected suggestions.',
      }
      const localTurns = [...turns, instruction]
      setTurns(localTurns)
      const builderTurn = await callBuilderOnce(localTurns)
      setTurns((prev) => [...prev, builderTurn])
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Improve selected failed'
      setRequestError(msg)
      setTurns((prev) => prev.slice(0, -1))
    } finally {
      setImproving(false)
    }
  }, [loading, reviewing, improving, suggestions, turns, callBuilderOnce])

  const insertArchitectTemplate = useCallback(() => {
    setDraft((prev) =>
      prev.trim()
        ? `${prev.trim()}\n\n${ARCHITECT_REFINE_TEMPLATE}`
        : ARCHITECT_REFINE_TEMPLATE,
    )
  }, [])

  const mapReviewToContextDraft = useCallback((reviewText: string) => {
    const lines = reviewText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .filter((l) => !/^#+\s/.test(l))

    const clean = (s: string) => s.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '').trim()
    const textLines = lines.map(clean).filter(Boolean)

    const description =
      textLines.find((l) => l.length > 40 && !/^Strengths$/i.test(l) && !/^Weaknesses$/i.test(l))
      ?? 'Refined based on AI reviewer guidance.'

    const bullets = textLines
      .filter((l) =>
        l.length > 20
        && !/^final verdict$/i.test(l)
        && !/^strengths$/i.test(l)
        && !/^weaknesses$/i.test(l),
      )
      .slice(0, 8)

    const howItWorks = bullets.length > 0
      ? `Reviewer guidance:\n- ${bullets.join('\n- ')}`
      : reviewText.trim()

    return { description, howItWorks }
  }, [])

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  const border = isDark ? 'border-white/10' : 'border-indigo-200/80'
  const subText = isDark ? 'text-white/50' : 'text-slate-500'

  const rootClass = embedded
    ? 'flex flex-col flex-1 min-h-0 min-w-0'
    : 'flex flex-col h-full min-h-0'

  return (
    <div className={rootClass}>
      {showHeader && !embedded && (
        <div className={`flex items-center gap-2 px-4 py-3 border-b shrink-0 ${border}`}>
          <Wand2 size={16} className={isDark ? 'text-violet-400' : 'text-violet-600'} />
          <span
            className={`text-[13px] font-semibold tracking-tight flex-1 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            Build with AI
          </span>
          {loading && <Loader2 size={14} className="text-violet-500 animate-spin shrink-0" />}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className={`p-1 rounded-md transition-colors ${
                isDark
                  ? 'text-white/40 hover:text-white hover:bg-white/10'
                  : 'text-slate-400 hover:text-slate-800 hover:bg-slate-200/80'
              }`}
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      <p className={`px-4 py-2 text-[11px] leading-snug border-b shrink-0 ${border} ${subText}`}>
        Describe what to build, then keep chatting to refine — each send includes your{' '}
        <strong className="font-medium">current</strong> diagram. Switch tabs anytime (e.g. Review) and
        come back here to apply changes. Requires API server and{' '}
        <span className="font-mono">OPENAI_API_KEY</span>.
      </p>

      {!flowContext && (
        <div className={`px-4 py-2 border-b shrink-0 ${border}`}>
          <p className={`text-[11px] leading-snug ${isDark ? 'text-amber-300/85' : 'text-amber-700'}`}>
            Tip: add <strong>Flow Context</strong> (use case + constraints) for better AI build quality.
          </p>
        </div>
      )}

      <div className={`px-3 py-2 border-b shrink-0 ${border}`}>
        <button
          type="button"
          onClick={insertArchitectTemplate}
          disabled={loading || reviewing || improving}
          className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] border transition-colors ${
            isDark
              ? 'border-violet-500/35 text-violet-200 bg-violet-900/20 hover:bg-violet-900/30'
              : 'border-violet-300 text-violet-800 bg-violet-50 hover:bg-violet-100'
          } disabled:opacity-40`}
          title="Insert reusable architecture-refinement prompt"
        >
          Insert architecture refine template
        </button>
      </div>

      {suggestions.length > 0 && (
        <div className={`px-3 py-2 border-b shrink-0 ${border}`}>
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className={`text-[11px] ${subText}`}>Review suggestions (select what to apply)</div>
            <button
              type="button"
              onClick={toggleAllSuggestions}
              className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                isDark
                  ? 'border-white/15 text-white/70 hover:bg-white/10'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {suggestions.every((s) => s.selected) ? 'Clear all' : 'Select all'}
            </button>
          </div>
          <div className="max-h-28 overflow-y-auto space-y-1 pr-1 sidebar-scroll">
            {suggestions.map((s) => (
              <label key={s.id} className="flex items-start gap-2 text-[11px] leading-snug cursor-pointer">
                <input
                  type="checkbox"
                  checked={s.selected}
                  onChange={() => toggleSuggestion(s.id)}
                  className="mt-0.5 accent-violet-500"
                />
                <span className={isDark ? 'text-white/70' : 'text-slate-700'}>{s.text}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0 sidebar-scroll"
      >
        {turns.length === 0 && !loading && (
          <div className={`text-[12px] leading-relaxed space-y-2 ${subText}`}>
            <p>
              <span className={isDark ? 'text-white/70' : 'text-slate-700'}>First message:</span>{' '}
              &ldquo;Create a RAG pipeline: PDFs → chunk → embed → vector DB → retriever → LLM.&rdquo;
            </p>
            <p>
              <span className={isDark ? 'text-white/70' : 'text-slate-700'}>Then refine:</span>{' '}
              &ldquo;Add guardrails before the LLM&rdquo; or &ldquo;Connect retriever output to the prompt input.&rdquo;
            </p>
          </div>
        )}
        {turns.map((t, i) => (
          <div
            key={i}
            className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[92%] rounded-xl px-3 py-2 text-[12px] leading-relaxed ${
                t.role === 'user'
                  ? isDark
                    ? 'bg-violet-600/90 text-white'
                    : 'bg-violet-600 text-white'
                  : isDark
                    ? 'bg-white/8 text-white/85 border border-white/10'
                    : 'bg-white text-slate-800 border border-slate-200 shadow-sm'
              }`}
            >
              <div className="whitespace-pre-wrap">{t.content}</div>
              {t.kind === 'reviewer' && (
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className={`text-[10px] ${isDark ? 'text-sky-300/80' : 'text-sky-700'}`}>
                    Reviewer findings available for context.
                  </p>
                  {onUseReviewInContext && (
                    <button
                      type="button"
                      onClick={() => onUseReviewInContext(mapReviewToContextDraft(t.content))}
                      className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                        isDark
                          ? 'border-sky-500/40 text-sky-300 hover:bg-sky-900/25'
                          : 'border-sky-300 text-sky-700 hover:bg-sky-50'
                      }`}
                    >
                      Use in Flow Context
                    </button>
                  )}
                </div>
              )}
              {t.appliedPatches != null && t.appliedPatches > 0 && (
                <p
                  className={`mt-2 text-[10px] font-medium ${
                    isDark ? 'text-emerald-400/90' : 'text-emerald-700'
                  }`}
                >
                  Applied {t.appliedPatches} graph update{t.appliedPatches === 1 ? '' : 's'}.
                </p>
              )}
              {t.validationErrors && t.validationErrors.length > 0 && (
                <div
                  className={`mt-2 pt-2 border-t space-y-1 ${
                    isDark ? 'border-white/10' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1 text-amber-500 text-[10px] font-semibold">
                    <AlertTriangle size={11} />
                    Patch validation
                  </div>
                  <ul className="text-[10px] opacity-90 list-disc pl-3 space-y-0.5">
                    {t.validationErrors.slice(0, 6).map((err, j) => (
                      <li key={j}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
        {requestError && (
          <p className="text-[11px] text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-2 py-1.5">
            {requestError}
          </p>
        )}
      </div>

      <div className={`p-3 border-t shrink-0 space-y-2 ${border}`}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={loading}
          rows={6}
          placeholder="Describe what to build… (Enter to send, Shift+Enter for newline)"
          className={`w-full rounded-lg px-3 py-2 text-[12px] resize-y min-h-[120px] max-h-[45vh] outline-none border ${
            isDark
              ? 'bg-white/5 border-white/15 text-white placeholder:text-white/35 focus:border-violet-500/50'
              : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-violet-500/70'
          }`}
        />
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={loading || reviewing || improving || !draft.trim()}
          className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-medium transition-opacity border ${
            isDark
              ? 'bg-violet-600 hover:bg-violet-500 text-white border-violet-500/40 disabled:opacity-40'
              : 'bg-violet-600 hover:bg-violet-500 text-white border-violet-700/30 disabled:opacity-40'
          }`}
        >
          <Send size={14} />
          Send
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => void handleReviewOnly()}
            disabled={loading || reviewing || improving}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-medium transition-opacity border ${
              isDark
                ? 'bg-sky-700/80 hover:bg-sky-600/90 text-white border-sky-500/40 disabled:opacity-40'
                : 'bg-sky-600 hover:bg-sky-500 text-white border-sky-700/30 disabled:opacity-40'
            }`}
          >
            {reviewing ? <Loader2 size={14} className="animate-spin" /> : <CheckSquare size={14} />}
            {reviewing ? 'Reviewing…' : 'Review'}
          </button>
          <button
            type="button"
            onClick={() => void handleImproveSelected()}
            disabled={loading || reviewing || improving}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-medium transition-opacity border ${
              isDark
                ? 'bg-emerald-700/80 hover:bg-emerald-600/90 text-white border-emerald-500/40 disabled:opacity-40'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-700/30 disabled:opacity-40'
            }`}
          >
            {improving ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
            {improving ? 'Applying…' : 'Improve'}
          </button>
        </div>
      </div>
    </div>
  )
}
