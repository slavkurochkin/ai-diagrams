import type { IconProps } from './index'

export default function TaskCompletionIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Bullseye rings */}
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
      {/* Arrow hitting target */}
      <path d="M12 2v4M22 12h-4" />
    </svg>
  )
}
