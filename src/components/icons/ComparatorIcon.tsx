import type { IconProps } from './index'

export default function ComparatorIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Left panel */}
      <rect x="2" y="5" width="7" height="14" rx="1.5" />
      {/* Right panel */}
      <rect x="15" y="5" width="7" height="14" rx="1.5" />
      {/* VS arrows */}
      <path d="M11 10l2 2-2 2" />
    </svg>
  )
}
