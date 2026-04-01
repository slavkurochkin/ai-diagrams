interface IconProps {
  size?: number
  className?: string
}

// Globe (the web) with a small magnifying glass overlapping the bottom-right corner.
// Builds on the vocabulary of RetrieverIcon (magnifier = search) but adds the globe
// to communicate "searching the internet specifically, not the vector store."
export default function WebSearchIcon({ size = 24, className }: IconProps) {
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
      {/* Globe circle */}
      <circle cx="10" cy="11" r="8" />

      {/* Center meridian (vertical arc — simplified to a line) */}
      <line x1="10" y1="3" x2="10" y2="19" />

      {/* Equator */}
      <path d="M2 11 A8 3 0 0 0 18 11" />

      {/* Upper latitude arc */}
      <path d="M4 6.5 A7 2.5 0 0 0 16 6.5" />

      {/* Small magnifying glass — overlaps bottom-right of globe */}
      <circle cx="19.5" cy="19.5" r="2.5" />
      <line x1="21.5" y1="21.5" x2="23" y2="23" strokeWidth={2} />
    </svg>
  )
}
