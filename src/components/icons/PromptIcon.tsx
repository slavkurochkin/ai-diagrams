interface IconProps {
  size?: number
  className?: string
}

// Speech bubble with a tail at bottom-left — this is the resolved, final prompt
// being sent to the model. Distinct from PromptTemplate (document + curly braces)
// because it represents a completed message, not a template definition.
export default function PromptIcon({ size = 24, className }: IconProps) {
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
      {/* Speech bubble outline with tail at bottom-left
          Path: top-left → top edge → top-right corner → right edge →
          bottom-right corner → bottom edge to x=11 → tail down to y=20 →
          tail back up to y=16 → bottom edge to x=4 → bottom-left corner →
          left edge back up */}
      <path d="M4 4 H20 C21.1 4 22 4.9 22 6 V14 C22 15.1 21.1 16 20 16 H11 L7 20 L7 16 H4 C2.9 16 2 15.1 2 14 V6 C2 4.9 2.9 4 4 4 Z" />

      {/* Message text lines inside bubble */}
      <line x1="6" y1="9" x2="18" y2="9" />
      <line x1="6" y1="12.5" x2="14" y2="12.5" />
    </svg>
  )
}
