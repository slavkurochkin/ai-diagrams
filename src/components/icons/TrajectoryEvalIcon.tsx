import type { IconProps } from './index'

export default function TrajectoryEvalIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Path with waypoints */}
      <circle cx="4" cy="12" r="2" />
      <circle cx="12" cy="6" r="2" />
      <circle cx="20" cy="12" r="2" />
      <circle cx="12" cy="18" r="2" />
      {/* Connecting lines */}
      <path d="M6 12q3-3 6-6" />
      <path d="M14 6q3 3 4 6" />
      <path d="M20 14q-3 3-6 4" />
      {/* Score on final step */}
      <path d="M10.5 18l1 1 2-2" strokeWidth={1.2} />
    </svg>
  )
}
