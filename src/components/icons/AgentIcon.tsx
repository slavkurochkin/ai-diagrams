interface IconProps {
  size?: number
  className?: string
}

// Robot face: antenna + boxy head + ear panels + LED eyes + mouth.
// Immediately reads as "autonomous agent / bot" — distinct from all other icons.
export default function AgentIcon({ size = 24, className }: IconProps) {
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
      {/* Antenna */}
      <line x1="12" y1="2" x2="12" y2="5" />
      <circle cx="12" cy="1.5" r="1" />

      {/* Ear panels — small rectangles flanking the head */}
      <rect x="1.5" y="10" width="2.5" height="4.5" rx="0.5" />
      <rect x="20" y="10" width="2.5" height="4.5" rx="0.5" />

      {/* Head */}
      <rect x="4" y="5" width="16" height="15" rx="2" />

      {/* Eyes — outer ring (subtle glow) + center dot (LED) */}
      <circle cx="9.5" cy="11" r="2" fill="currentColor" fillOpacity={0.15} />
      <circle cx="14.5" cy="11" r="2" fill="currentColor" fillOpacity={0.15} />
      <circle cx="9.5" cy="11" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="11" r="0.8" fill="currentColor" stroke="none" />

      {/* Mouth */}
      <line x1="8.5" y1="16.5" x2="15.5" y2="16.5" />
    </svg>
  )
}
