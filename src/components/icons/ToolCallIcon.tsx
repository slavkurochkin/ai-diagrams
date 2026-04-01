interface IconProps {
  size?: number
  className?: string
}

// Classic </> code bracket pair with a forward slash.
// Universally understood as "code / function".
// A small call indicator (arrow entering from left) reinforces "invocation".
export default function ToolCallIcon({ size = 24, className }: IconProps) {
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
      {/* Left angle bracket < */}
      <polyline points="9,7 4,12 9,17" />

      {/* Right angle bracket > */}
      <polyline points="15,7 20,12 15,17" />

      {/* Forward slash / */}
      <line x1="14" y1="7" x2="10" y2="17" />

      {/* Call arrow entering from top-left — "invoke" */}
      <path d="M2 4 L5 4" />
      <polyline points="3.5,2.5 5,4 3.5,5.5" />
    </svg>
  )
}
