import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Copy, Check, FileCode2 } from 'lucide-react'

interface PromptPanelProps {
  open: boolean
  prompt: string
  onClose: () => void
}

export default function PromptPanel({ open, prompt, onClose }: PromptPanelProps) {
  const [copied, setCopied] = useState(false)

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: select the textarea
    }
  }, [prompt])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.97, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none"
          >
            <div
              className="
                pointer-events-auto
                w-full max-w-3xl max-h-[88vh] flex flex-col
                bg-gray-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden
              "
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 shrink-0">
                <div className="flex items-center gap-2.5">
                  <FileCode2 size={15} className="text-violet-400" />
                  <div>
                    <h2 className="text-[13px] font-semibold text-white">Implementation Prompt</h2>
                    <p className="text-[11px] text-white/40 mt-0.5">
                      Copy and paste into Claude or any coding agent
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className={`
                      flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                      text-[11px] font-medium border transition-colors
                      ${copied
                        ? 'text-green-300 bg-green-900/25 border-green-600/30'
                        : 'text-white/70 bg-white/5 border-white/10 hover:bg-white/10 hover:text-white'}
                    `}
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Prompt content */}
              <div className="flex-1 overflow-y-auto min-h-0">
                <pre
                  className="
                    p-5 text-[12px] leading-relaxed font-mono
                    text-white/75 whitespace-pre-wrap break-words
                    selection:bg-violet-500/30
                  "
                >
                  {prompt}
                </pre>
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-white/8 shrink-0 flex items-center justify-between">
                <p className="text-[11px] text-white/30">
                  {prompt.split('\n').length} lines · {prompt.length.toLocaleString()} characters
                </p>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                    text-[11px] font-medium border transition-colors
                    ${copied
                      ? 'text-green-300 bg-green-900/25 border-green-600/30'
                      : 'text-violet-300/80 bg-violet-900/20 border-violet-600/25 hover:bg-violet-900/35 hover:text-violet-200'}
                  `}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'Copied!' : 'Copy to clipboard'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
