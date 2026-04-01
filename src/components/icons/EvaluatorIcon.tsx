interface IconProps {
  size?: number
  className?: string
}

// Balance scale — left pan is lower (weighted), right pan is higher (being evaluated).
// The asymmetry communicates active measurement, not static balance.
export default function EvaluatorIcon({ size = 24, className }: IconProps) {
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
      {/* Center pole */}
      <line x1="12" y1="8" x2="12" y2="21" />

      {/* Base */}
      <line x1="8" y1="21" x2="16" y2="21" />

      {/* Fulcrum triangle */}
      <path
        d="M10.5 8 L12 5 L13.5 8 Z"
        fill="currentColor"
        fillOpacity={0.2}
      />

      {/* Horizontal beam */}
      <line x1="3" y1="8" x2="21" y2="8" />

      {/* Left string + pan — lower, heavier */}
      <line x1="5" y1="8" x2="5" y2="16" />
      <path d="M3 16 A2 2 0 0 0 7 16" />

      {/* Right string + pan — higher, being weighed */}
      <line x1="19" y1="8" x2="19" y2="13" />
      <path d="M17 13 A2 2 0 0 0 21 13" />
    </svg>
  )
}
