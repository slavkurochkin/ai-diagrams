interface IconProps {
  size?: number
  className?: string
}

// Magnifying glass with three horizontal lines inside the lens.
// Lines suggest "searching through a list of documents".
export default function RetrieverIcon({ size = 24, className }: IconProps) {
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
      {/* Lens */}
      <circle cx="10" cy="10" r="6.5" />

      {/* Handle — slightly thicker for visual weight */}
      <line x1="15" y1="15" x2="21" y2="21" strokeWidth={2} />

      {/* Document lines inside the lens */}
      <line x1="6.5" y1="8.5" x2="13.5" y2="8.5" />
      <line x1="6.5" y1="10.5" x2="13.5" y2="10.5" />
      <line x1="6.5" y1="12.5" x2="11" y2="12.5" />
    </svg>
  )
}
