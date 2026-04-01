interface IconProps {
  size?: number
  className?: string
}

// Isometric cube — evokes a 3D vector/embedding space rather than a flat database.
// Four dots on the top face suggest high-dimensional data points.
export default function VectorDBIcon({ size = 24, className }: IconProps) {
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
      {/* Top face — diamond */}
      <path
        d="M12 2 L20 7 L12 12 L4 7 Z"
        fill="currentColor"
        fillOpacity={0.1}
      />

      {/* Left face */}
      <path
        d="M4 7 L12 12 L12 21 L4 16 Z"
        fill="currentColor"
        fillOpacity={0.05}
      />

      {/* Right face */}
      <path
        d="M20 7 L12 12 L12 21 L20 16 Z"
        fill="currentColor"
        fillOpacity={0.08}
      />

      {/* Vertical edges */}
      <line x1="4" y1="7" x2="4" y2="16" />
      <line x1="20" y1="7" x2="20" y2="16" />
      <line x1="12" y1="12" x2="12" y2="21" />

      {/* Bottom edges */}
      <line x1="4" y1="16" x2="12" y2="21" />
      <line x1="20" y1="16" x2="12" y2="21" />

      {/* Data points on top face — suggest embeddings in vector space */}
      <circle cx="10" cy="7" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="14" cy="7" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="10" cy="9.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="14" cy="9.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}
