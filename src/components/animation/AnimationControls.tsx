import { Play, Pause, Square, Gauge, SkipForward } from 'lucide-react'
import type { AnimationStatus, AnimationSpeed } from '../../types/animation'

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
          bg-teal-700/80 border-teal-500/40 text-white
          hover:bg-teal-600/90 hover:border-teal-400/60
          disabled:opacity-40 disabled:pointer-events-none
        "
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
            bg-white/8 border-white/15 text-white/80
            hover:bg-white/15 hover:text-white
            disabled:opacity-40 disabled:pointer-events-none
          "
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
            p-1.5 rounded-md text-white/50
            border border-white/10 bg-white/5
            hover:text-white/80 hover:bg-white/10
            transition-all duration-150
          "
        >
          <Square size={13} />
        </button>
      )}

      {/* Speed selector */}
      <div className="flex items-center gap-0.5 ml-0.5">
        <Gauge size={12} className="text-white/30" />
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSpeedChange(s)}
            className={`
              px-1.5 py-1 rounded text-[10px] font-mono font-medium
              transition-colors duration-150
              ${speed === s
                ? 'text-white bg-white/15 border border-white/20'
                : 'text-white/35 hover:text-white/60'
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
