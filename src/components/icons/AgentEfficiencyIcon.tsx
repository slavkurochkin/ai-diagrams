import type { IconProps } from './index'

export default function AgentEfficiencyIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Lightning bolt */}
      <path d="M13 2L4.5 13.5H11L10 22l8.5-11.5H13L13 2z" />
    </svg>
  )
}
