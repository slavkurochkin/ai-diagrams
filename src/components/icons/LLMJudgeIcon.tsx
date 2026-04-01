import type { IconProps } from './index'

export default function LLMJudgeIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Vertical post + base */}
      <path d="M12 3v18M9 21h6" />
      {/* Horizontal beam */}
      <path d="M3 7h18" />
      {/* Left chain + pan */}
      <path d="M5 7v4" />
      <path d="M2 11q3 4 6 0" />
      {/* Right chain + pan */}
      <path d="M19 7v4" />
      <path d="M16 11q3 4 6 0" />
    </svg>
  )
}
