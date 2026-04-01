import type { IconProps } from './index'

export default function MultiTurnEvalIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* User bubble (left) */}
      <path d="M3 6h10a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H6l-3 2V7a1 1 0 0 1 0 0z" />
      {/* Agent bubble (right) */}
      <path d="M21 12H13a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h5l3 2v-6a1 1 0 0 0 0 0z" />
      {/* Score tick */}
      <path d="M18 16.5l.5.5 1-1" />
    </svg>
  )
}
