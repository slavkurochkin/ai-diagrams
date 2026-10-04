import { motion } from 'framer-motion'
import type { AlignOp, AlignOpType } from '../../lib/wer'

// Word-by-word alignment chips shared by the WER visualizer panel and the ASR Eval
// node's playback overlay. Colour encodes the edit; substitutions show both words.

export const OP_STYLE: Record<AlignOpType, { label: string; letter: string; chip: string; text: string }> = {
  match: { label: 'match', letter: '', chip: 'bg-white/[0.06] border-white/10', text: 'text-white/70' },
  sub: { label: 'substitution', letter: 'S', chip: 'bg-amber-500/15 border-amber-400/50', text: 'text-amber-200' },
  del: { label: 'deletion', letter: 'D', chip: 'bg-rose-500/15 border-rose-400/50', text: 'text-rose-200' },
  ins: { label: 'insertion', letter: 'I', chip: 'bg-sky-500/15 border-sky-400/50', text: 'text-sky-200' },
}

interface WerAlignmentProps {
  ops: AlignOp[]
  /** Smaller chips for the canvas overlay. */
  compact?: boolean
  /** Stagger chips in one by one (playback). */
  animate?: boolean
}

export default function WerAlignment({ ops, compact = false, animate = false }: WerAlignmentProps) {
  if (ops.length === 0) {
    return <p className="text-[11px] text-white/30">Nothing to align yet.</p>
  }
  const word = compact ? 'text-[10px]' : 'text-[13px]'
  const sub = compact ? 'text-[8px]' : 'text-[10px]'
  const pad = compact ? 'px-1.5 py-0.5' : 'px-2 py-1'
  const stagger = Math.min(0.08, 0.9 / ops.length)

  return (
    <div className={`flex flex-wrap ${compact ? 'gap-1' : 'gap-1.5'}`}>
      {ops.map((op, i) => {
        const s = OP_STYLE[op.type]
        const title =
          op.type === 'sub' ? `substitution: "${op.ref}" heard as "${op.hyp}"`
            : op.type === 'del' ? `deletion: "${op.ref}" was missed`
            : op.type === 'ins' ? `insertion: "${op.hyp}" was added`
            : 'match'
        return (
          <motion.div
            key={i}
            title={title}
            initial={animate ? { opacity: 0, y: 4 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, delay: animate ? i * stagger : 0 }}
            className={`relative flex flex-col items-center rounded-md border ${pad} ${s.chip}`}
          >
            {op.type === 'sub' && (
              <>
                <span className={`${sub} line-through text-white/40 leading-tight`}>{op.ref}</span>
                <span className={`${word} font-medium leading-tight ${s.text}`}>{op.hyp}</span>
              </>
            )}
            {op.type === 'del' && (
              <span className={`${word} font-medium leading-tight line-through ${s.text}`}>{op.ref}</span>
            )}
            {op.type === 'ins' && (
              <span className={`${word} font-medium leading-tight ${s.text}`}>+{op.hyp}</span>
            )}
            {op.type === 'match' && (
              <span className={`${word} leading-tight ${s.text}`}>{op.ref}</span>
            )}
            {s.letter && (
              <span className={`absolute -top-1.5 -right-1.5 rounded-full bg-gray-950 border border-white/20 ${sub} font-bold px-1 leading-tight ${s.text}`}>
                {s.letter}
              </span>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
