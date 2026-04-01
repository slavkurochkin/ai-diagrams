import type { IconProps } from './index'

export default function HumanRaterIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Person head */}
      <circle cx="10" cy="7" r="3.5" />
      {/* Person body */}
      <path d="M3 21v-1a7 7 0 0 1 10.46-6.07" />
      {/* Thumbs up */}
      <path d="M14 11h2a2 2 0 0 1 2 2v1h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-5a2 2 0 0 1-2-2v-3c0-.55.22-1.05.59-1.41L14 11z" />
      <path d="M14 11V9a1.5 1.5 0 0 1 3 0v2" />
    </svg>
  )
}
