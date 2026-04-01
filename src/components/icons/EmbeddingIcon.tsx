interface IconProps {
  size?: number
  className?: string
}

// Text lines (left) → arrow → vertical bars of varying heights (right).
// The bars communicate "language converted into a numeric vector."
// Bar heights are intentionally unequal so they read as data, not decoration.
export default function EmbeddingIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {/* Text representation — three lines, last one shorter */}
      <line x1="2" y1="8" x2="8" y2="8" />
      <line x1="2" y1="11" x2="8" y2="11" />
      <line x1="2" y1="14" x2="6" y2="14" />

      {/* Transformation arrow */}
      <line x1="9" y1="11" x2="12" y2="11" />
      <polyline points="10.5,9.5 12,11 10.5,12.5" />

      {/* Vector bars — different heights, bottom-aligned at y=18 */}
      <line x1="14" y1="18" x2="14" y2="10" />
      <line x1="16.5" y1="18" x2="16.5" y2="13" />
      <line x1="19" y1="18" x2="19" y2="8" />
      <line x1="21.5" y1="18" x2="21.5" y2="14" />
    </svg>
  )
}
