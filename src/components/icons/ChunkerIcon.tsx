interface IconProps {
  size?: number
  className?: string
}

// Document rectangle divided by two dashed horizontal cut lines into three chunks.
// The dashes communicate "this is where the splits happen" — a real, named parameter
// in RAG pipelines (chunk size, overlap strategy). Instantly readable at 16px.
export default function ChunkerIcon({ size = 24, className }: IconProps) {
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
      {/* Document outline */}
      <rect x="4" y="2" width="16" height="20" rx="2" />

      {/* Dashed cut lines — these are the chunk boundaries */}
      <line x1="4" y1="9" x2="20" y2="9" strokeDasharray="2 1.5" />
      <line x1="4" y1="16" x2="20" y2="16" strokeDasharray="2 1.5" />

      {/* Content lines in each chunk — makes the sections read as text */}
      <line x1="7" y1="5.5" x2="17" y2="5.5" />
      <line x1="7" y1="12.5" x2="14" y2="12.5" />
      <line x1="7" y1="19" x2="17" y2="19" />
    </svg>
  )
}
