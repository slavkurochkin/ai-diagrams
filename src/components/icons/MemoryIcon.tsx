interface IconProps {
  size?: number
  className?: string
}

// Three stacked memory layers (like RAM slots) on the left.
// A cubic bezier loop arrow on the right suggests recall / retrieval over time.
export default function MemoryIcon({ size = 24, className }: IconProps) {
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
      {/* Three elliptical memory layers */}
      <ellipse cx="10.5" cy="5" rx="6.5" ry="2" />
      <line x1="4" y1="5" x2="4" y2="11" />
      <line x1="17" y1="5" x2="17" y2="11" />

      <ellipse cx="10.5" cy="11" rx="6.5" ry="2" />
      <line x1="4" y1="11" x2="4" y2="17" />
      <line x1="17" y1="11" x2="17" y2="17" />

      <ellipse cx="10.5" cy="17" rx="6.5" ry="2" />

      {/* Loop / recall arrow on the right — reads as "this data is retrieved later" */}
      {/* Cubic bezier from top of stack to bottom, curving right */}
      <path d="M17 7 C22 7 22 17 17 17" />

      {/* Arrowhead at bottom of loop pointing left */}
      <polyline points="15,15.5 17,17 15,18.5" />
    </svg>
  )
}
