interface IconProps {
  size?: number
  className?: string
}

// One input arrow → diamond decision point → two output arrows diverging up and down.
// The diamond is the universal flowchart decision symbol — immediately understood.
// Essential for any pipeline that has conditional branching (intent routing, agent loops).
export default function RouterIcon({ size = 24, className }: IconProps) {
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
      {/* Input arrow from left */}
      <line x1="2" y1="12" x2="7.5" y2="12" />

      {/* Decision diamond — subtly filled */}
      <path
        d="M7.5 12 L11 8.5 L14.5 12 L11 15.5 Z"
        fill="currentColor"
        fillOpacity={0.15}
      />

      {/* Upper exit: line + corner arrowhead */}
      <line x1="14.5" y1="12" x2="21" y2="5.5" />
      <polyline points="19,5.5 21,5.5 21,7.5" />

      {/* Lower exit: line + corner arrowhead */}
      <line x1="14.5" y1="12" x2="21" y2="18.5" />
      <polyline points="19,18.5 21,18.5 21,16.5" />
    </svg>
  )
}
