import type { IconProps } from './index'

export default function RubricIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Check row 1 */}
      <path d="M4 6l2 2 3-3" />
      <line x1="11" y1="7" x2="20" y2="7" />
      {/* Check row 2 */}
      <path d="M4 12l2 2 3-3" />
      <line x1="11" y1="13" x2="20" y2="13" />
      {/* Partial row 3 (in progress) */}
      <circle cx="6" cy="18" r="1.5" />
      <line x1="11" y1="18" x2="17" y2="18" />
    </svg>
  )
}
