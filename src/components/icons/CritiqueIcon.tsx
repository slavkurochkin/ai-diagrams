import type { IconProps } from './index'

export default function CritiqueIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Speech bubble */}
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      {/* Refresh arrow inside */}
      <path d="M9 10a3 3 0 0 1 5.12-2.12" />
      <path d="M14 8v2.5h-2.5" />
    </svg>
  )
}
