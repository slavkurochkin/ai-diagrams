interface IconProps {
  size?: number
  className?: string
}

// Shield outline with a horizontal barrier line and two vertical pillars inside.
// The fence pattern inside the shield reads immediately as "guardrail / gate".
export default function GuardrailsIcon({ size = 24, className }: IconProps) {
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
      {/* Shield outline */}
      <path d="M12 3 L20 6.5 L20 14 C20 18 16.5 21 12 22.5 C7.5 21 4 18 4 14 L4 6.5 Z" />

      {/* Horizontal barrier rail across the shield */}
      <line x1="4" y1="13" x2="20" y2="13" />

      {/* Vertical pillars — creates a fence / gate pattern */}
      <line x1="9" y1="10.5" x2="9" y2="15.5" />
      <line x1="15" y1="10.5" x2="15" y2="15.5" />
    </svg>
  )
}
