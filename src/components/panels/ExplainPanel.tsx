import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, Loader2, FlaskConical, RefreshCw, ClipboardCheck, Copy, Check } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'

// ── Types ──────────────────────────────────────────────────────────────────────

type PanelStatus = 'idle' | 'loading' | 'streaming' | 'done' | 'error'
type PanelTab = 'explain' | 'review' | 'eval'

interface ExplainPanelProps {
  open: boolean
  onClose: () => void
  activeTab: PanelTab
  onTabChange: (tab: PanelTab) => void
  explainText: string
  explainStatus: PanelStatus
  reviewText: string
  reviewStatus: PanelStatus
  reviewDisabled: boolean
  onGenerateReview: () => void
  evalText: string
  evalStatus: PanelStatus
  evalDisabled: boolean
  onGenerateEval: () => void
}

// ── Markdown component map ─────────────────────────────────────────────────────

const MD_COMPONENTS: Components = {
  h1: ({ children }) => (
    <h1 className="text-[14px] font-bold text-white mt-5 mb-2 first:mt-0 pb-1 border-b border-white/10">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-[13px] font-semibold text-white mt-5 mb-2 first:mt-0 pb-1 border-b border-white/10">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-[12px] font-semibold text-white/90 mt-4 mb-1.5 first:mt-0">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="text-[12px] text-white/70 leading-relaxed mb-2 last:mb-0">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="mb-3 space-y-1 pl-4 last:mb-0">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 space-y-1 pl-4 list-decimal last:mb-0">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="text-[12px] text-white/70 leading-relaxed relative before:content-['–'] before:absolute before:-left-3.5 before:text-white/25">
      {children}
    </li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-white">
      {children}
    </strong>
  ),
  em: ({ children }) => (
    <em className="italic text-white/55">{children}</em>
  ),
  code: ({ children, className }) => {
    // Block code (inside pre) vs inline code
    const isBlock = className?.includes('language-')
    if (isBlock) {
      return (
        <code className="block text-[11px] font-mono text-sky-300 leading-relaxed">
          {children}
        </code>
      )
    }
    return (
      <code className="font-mono text-[11px] text-sky-300 bg-sky-950/40 border border-sky-800/40 px-1 py-0.5 rounded">
        {children}
      </code>
    )
  },
  pre: ({ children }) => (
    <pre className="mb-3 p-3 rounded-lg bg-white/5 border border-white/10 overflow-x-auto last:mb-0">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-3 pl-3 border-l-2 border-sky-500/60 text-white/50 italic last:mb-0">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-white/10" />,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="text-sky-400 hover:text-sky-300 underline underline-offset-2 transition-colors">
      {children}
    </a>
  ),
}

// ── Markdown content area ──────────────────────────────────────────────────────

function MarkdownContent({
  text,
  status,
  idleMessage,
  loadingMessage,
}: {
  text: string
  status: PanelStatus
  idleMessage: string
  loadingMessage: string
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)

  // Auto-scroll while streaming
  useEffect(() => {
    if (status === 'streaming' && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [text, status])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }, [text])

  const hasContent = (status === 'streaming' || status === 'done') && text

  return (
    <div className="flex-1 overflow-hidden flex flex-col min-h-0">
      {/* Copy button — appears once content starts arriving */}
      {hasContent && (
        <div className="flex justify-end px-4 pt-2 pb-0 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            title="Copy markdown"
            className="
              flex items-center gap-1 px-2 py-1 rounded-md text-[11px]
              text-white/30 hover:text-white/70 hover:bg-white/5
              border border-transparent hover:border-white/10
              transition-all duration-150
            "
          >
            {copied
              ? <><Check size={11} className="text-green-400" /> Copied</>
              : <><Copy size={11} /> Copy</>
            }
          </button>
        </div>
      )}

      {/* Scrollable body */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 min-h-0"
      >
        {status === 'idle' && idleMessage && (
          <p className="text-[12px] text-white/30 italic">{idleMessage}</p>
        )}

        {status === 'loading' && (
          <div className="flex items-center gap-2 text-white/40 text-[12px]">
            <Loader2 size={13} className="animate-spin shrink-0" />
            {loadingMessage}
          </div>
        )}

        {hasContent && (
          <div className="prose-invert">
            <ReactMarkdown components={MD_COMPONENTS}>
              {text}
            </ReactMarkdown>

            {status === 'streaming' && (
              <motion.span
                className="inline-block w-1.5 h-3.5 bg-sky-400 rounded-sm ml-0.5 align-middle"
                animate={{ opacity: [1, 0, 1] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
              />
            )}
          </div>
        )}

        {status === 'error' && (
          <p className="text-[12px] text-red-400">
            {text || 'An error occurred. Check server logs.'}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Generate prompt (idle state for review/eval tabs) ──────────────────────────

function GeneratePrompt({
  icon,
  description,
  buttonLabel,
  onClick,
  disabled,
}: {
  icon: React.ReactNode
  description: string
  buttonLabel: string
  onClick: () => void
  disabled: boolean
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-5 gap-3">
      <p className="text-[12px] text-white/40 text-center leading-relaxed">
        {description}
      </p>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="
          flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium
          bg-teal-700/80 border border-teal-500/40 text-white
          hover:bg-teal-600/90 transition-colors
          disabled:opacity-40 disabled:pointer-events-none
        "
      >
        {icon}
        {buttonLabel}
      </button>
    </div>
  )
}

// ── Footer ─────────────────────────────────────────────────────────────────────

function TabFooter({
  status,
  hint,
  onRegenerate,
}: {
  status: PanelStatus
  hint?: string
  onRegenerate: () => void
}) {
  if (status !== 'done') return null
  return (
    <div className="flex items-center justify-between px-4 py-2 border-t border-white/8 shrink-0">
      <p className="text-[11px] text-white/20">{hint ?? 'Powered by AI'}</p>
      <button
        type="button"
        onClick={onRegenerate}
        className="flex items-center gap-1 text-[11px] text-white/30 hover:text-white/60 transition-colors"
      >
        <RefreshCw size={10} />
        Regenerate
      </button>
    </div>
  )
}

// ── Panel ──────────────────────────────────────────────────────────────────────

const TAB_LABELS: Record<PanelTab, string> = { explain: 'Explain', review: 'Review', eval: 'Eval' }

const TAB_ICONS: Record<PanelTab, React.ReactNode> = {
  explain: <Sparkles size={14} className="text-sky-400 shrink-0" />,
  review:  <ClipboardCheck size={14} className="text-sky-400 shrink-0" />,
  eval:    <FlaskConical size={14} className="text-sky-400 shrink-0" />,
}

const TAB_TITLES: Record<PanelTab, string> = {
  explain: 'AI Explanation',
  review:  'Design Review',
  eval:    'Eval Suggestions',
}

export default function ExplainPanel({
  open, onClose,
  activeTab, onTabChange,
  explainText, explainStatus,
  reviewText, reviewStatus, reviewDisabled, onGenerateReview,
  evalText, evalStatus, evalDisabled, onGenerateEval,
}: ExplainPanelProps) {
  const statusMap: Record<PanelTab, PanelStatus> = {
    explain: explainStatus,
    review:  reviewStatus,
    eval:    evalStatus,
  }
  const isLoading = ['loading', 'streaming'].includes(statusMap[activeTab])

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          key="ai-panel"
          initial={{ x: 320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 320, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          className="w-80 shrink-0 flex flex-col bg-gray-950/95 border-l border-white/10 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 shrink-0">
            {TAB_ICONS[activeTab]}
            <span className="text-[13px] font-semibold text-white tracking-tight flex-1">
              {TAB_TITLES[activeTab]}
            </span>
            {isLoading && <Loader2 size={13} className="text-sky-400 animate-spin shrink-0" />}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={13} />
            </button>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 px-4 pt-2 border-b border-white/8 shrink-0">
            {(['explain', 'review', 'eval'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => onTabChange(tab)}
                className={`
                  px-3 py-1.5 text-[11px] font-medium transition-colors rounded-t
                  ${activeTab === tab
                    ? 'text-white border-b-2 border-sky-500 -mb-px'
                    : 'text-white/40 hover:text-white/70'}
                `}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>

          {/* ── Explain tab ── */}
          {activeTab === 'explain' && (
            <>
              <MarkdownContent
                text={explainText}
                status={explainStatus}
                idleMessage="Click Explain to analyze your pipeline."
                loadingMessage="Analyzing pipeline…"
              />
              <TabFooter
                status={explainStatus}
                hint="Powered by AI · click Explain again to refresh"
                onRegenerate={() => {}}
              />
            </>
          )}

          {/* ── Review tab ── */}
          {activeTab === 'review' && (
            <>
              {reviewStatus === 'idle'
                ? <GeneratePrompt
                    icon={<ClipboardCheck size={13} />}
                    description="Get a design critique — missing components, connection issues, and ranked improvements."
                    buttonLabel="Review design"
                    onClick={onGenerateReview}
                    disabled={reviewDisabled}
                  />
                : <MarkdownContent
                    text={reviewText}
                    status={reviewStatus}
                    idleMessage=""
                    loadingMessage="Reviewing design…"
                  />
              }
              <TabFooter status={reviewStatus} onRegenerate={onGenerateReview} />
            </>
          )}

          {/* ── Eval tab ── */}
          {activeTab === 'eval' && (
            <>
              {evalStatus === 'idle'
                ? <GeneratePrompt
                    icon={<FlaskConical size={13} />}
                    description="Generate targeted evaluation suggestions based on your flow and context."
                    buttonLabel="Generate suggestions"
                    onClick={onGenerateEval}
                    disabled={evalDisabled}
                  />
                : <MarkdownContent
                    text={evalText}
                    status={evalStatus}
                    idleMessage=""
                    loadingMessage="Generating evaluation suggestions…"
                  />
              }
              <TabFooter status={evalStatus} onRegenerate={onGenerateEval} />
            </>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
