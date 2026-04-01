interface IconProps {
  size?: number
  className?: string
}

// Three ranked list items (circles + lines) with a bidirectional sort arrow on the right.
// The up-down arrow communicates "this list is being reordered by score."
// Distinct from Retriever (magnifying glass = finding) because Reranker = re-scoring.
export default function RerankerIcon({ size = 24, className }: IconProps) {
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
      {/* Rank indicator dots (left) */}
      <circle cx="4" cy="7" r="2" />
      <circle cx="4" cy="12" r="2" />
      <circle cx="4" cy="17" r="2" />

      {/* List item lines */}
      <line x1="7.5" y1="7" x2="19" y2="7" />
      <line x1="7.5" y1="12" x2="19" y2="12" />
      <line x1="7.5" y1="17" x2="19" y2="17" />

      {/* Bidirectional sort arrow — indicates the list order is being changed */}
      <line x1="21.5" y1="9.5" x2="21.5" y2="14.5" />
      <polyline points="20,11 21.5,9.5 23,11" />
      <polyline points="20,13 21.5,14.5 23,13" />
    </svg>
  )
}
