import type { IconProps } from './index'

export default function RAGEvalIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Stack of retrieved docs */}
      <rect x="3" y="10" width="9" height="11" rx="1" />
      <path d="M6 10V7a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v11" />
      <path d="M9 6V4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v11" />
      {/* Rank indicator — top doc marked */}
      <path d="M5.5 14h4" />
      <path d="M5.5 17h2.5" />
      {/* @k badge */}
      <circle cx="19" cy="19" r="4" className="fill-none" />
      <path d="M17.5 19.5l1-1.5 1 1.5" />
      <path d="M20 17.5v3" />
    </svg>
  )
}
