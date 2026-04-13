import { Play, Pause, Square, Gauge, SkipForward } from 'lucide-react'
import type { AnimationStatus, AnimationSpeed } from '../../types/animation'
import { useFlowStore } from '../../hooks/useFlowStore'

interface AnimationControlsProps {
  status: AnimationStatus
  speed: AnimationSpeed
  disabled: boolean
  onPlay: () => void
  onPause: () => void
  onReset: () => void
  onSpeedChange: (s: AnimationSpeed) => void
  onStep?: () => void   // optional — shown only in presentation mode
}

const SPEEDS: AnimationSpeed[] = [0.5, 1, 2]

export default function AnimationControls({
  status, speed, disabled,
  onPlay, onPause, onReset, onSpeedChange, onStep,
}: AnimationControlsProps) {
  const theme = useFlowStore((s) => s.theme)
  const isDark = theme === 'dark'
  const isPlaying = status === 'playing'
  const isIdle    = status === 'idle' || status === 'done'

  return (
    <div className="flex items-center gap-1">
      {/* Play / Pause */}
      <button
        type="button"
        onClick={isPlaying ? onPause : onPlay}
        disabled={disabled}
        title={isPlaying ? 'Pause' : 'Play animation'}
        className="
          flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-medium
          border transition-all duration-150 select-none
          disabled:opacity-40 disabled:pointer-events-none
        "
          style={isDark
            ? { background: 'rgba(15,118,110,0.8)', borderColor: 'rgba(20,184,166,0.4)', color: '#fff' }
            : { background: 'rgba(13,148,136,0.9)', borderColor: 'rgba(20,184,166,0.5)', color: '#fff' }
          }
      >
        {isPlaying
          ? <><Pause size={13} /> Pause</>
          : <><Play  size={13} /> Play</>
        }
      </button>

      {/* Step — only in presentation mode (onStep provided), hidden while playing */}
      {onStep && !isPlaying && status !== 'done' && (
        <button
          type="button"
          onClick={onStep}
          disabled={disabled}
          title="Step to next node (Space)"
          className="
            flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-medium
            border transition-all duration-150 select-none
            disabled:opacity-40 disabled:pointer-events-none
          "
          style={isDark
            ? { background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)' }
            : { background: 'rgba(255,255,255,0.92)', borderColor: 'rgba(99,102,241,0.26)', color: '#334155' }
          }
        >
          <SkipForward size={13} />
          Next
        </button>
      )}

      {/* Reset — only when not idle */}
      {!isIdle && (
        <button
          type="button"
          onClick={onReset}
          title="Reset animation"
          className="
            p-1.5 rounded-md border
            transition-all duration-150
          "
          style={isDark
            ? { color: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)' }
            : { color: 'rgba(51,65,85,0.8)', borderColor: 'rgba(99,102,241,0.24)', background: 'rgba(255,255,255,0.92)' }
          }
        >
          <Square size={13} />
        </button>
      )}

      {/* Speed selector */}
      <div className="flex items-center gap-0.5 ml-0.5">
        <Gauge size={12} className={isDark ? 'text-white/30' : 'text-slate-500'} />
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSpeedChange(s)}
            className={`
              px-1.5 py-1 rounded text-[10px] font-mono font-medium
              transition-colors duration-150
              ${speed === s
                ? (isDark ? 'text-white bg-white/15 border border-white/20' : 'text-indigo-700 bg-indigo-100 border border-indigo-200')
                : (isDark ? 'text-white/35 hover:text-white/60' : 'text-slate-500 hover:text-indigo-700')
              }
            `}
          >
            {s}×
          </button>
        ))}
      </div>
    </div>
  )
}
