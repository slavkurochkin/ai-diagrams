interface IconProps {
  size?: number
  className?: string
}

// IC / processor chip with "LLM" lettered as stroke paths.
// Two pins on each side read as a hardware chip — evokes "language model" as a
// discrete processing unit. Letters drawn as strokes, no SVG text element.
export default function LLMIcon({ size = 24, className }: IconProps) {
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
      {/* Chip body */}
      <rect x="4" y="4" width="16" height="16" rx="2" />

      {/* Left pins */}
      <line x1="1" y1="9" x2="4" y2="9" />
      <line x1="1" y1="15" x2="4" y2="15" />

      {/* Right pins */}
      <line x1="20" y1="9" x2="23" y2="9" />
      <line x1="20" y1="15" x2="23" y2="15" />

      {/* L */}
      <line x1="6"  y1="7.5" x2="6"  y2="16.5" />
      <line x1="6"  y1="16.5" x2="9.5" y2="16.5" />

      {/* L */}
      <line x1="11" y1="7.5" x2="11" y2="16.5" />
      <line x1="11" y1="16.5" x2="14.5" y2="16.5" />

      {/* M */}
      <line x1="16" y1="7.5" x2="16"   y2="16.5" />
      <line x1="16" y1="7.5" x2="18"   y2="12"   />
      <line x1="18" y1="12"  x2="20"   y2="7.5"  />
      <line x1="20" y1="7.5" x2="20"   y2="16.5" />
    </svg>
  )
}
