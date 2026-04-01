import { Play, Pause, Square, Gauge } from 'lucide-react'
import type { AnimationStatus, AnimationSpeed } from '../../types/animation'

interface AnimationControlsProps {
  status: AnimationStatus
  speed: AnimationSpeed
  disabled: boolean
  onPlay: () => void
  onPause: () => void
  onReset: () => void
  onSpeedChange: (s: AnimationSpeed) => void
}

const SPEEDS: AnimationSpeed[] = [0.5, 1, 2]

export default function AnimationControls({
  status, speed, disabled,
  onPlay, onPause, onReset, onSpeedChange,
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
          bg-violet-700/80 border-violet-500/40 text-white
          hover:bg-violet-600/90 hover:border-violet-400/60
          disabled:opacity-40 disabled:pointer-events-none
        "
      >
        {isPlaying
          ? <><Pause size={13} /> Pause</>
          : <><Play  size={13} /> Play</>
        }
      </button>

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
