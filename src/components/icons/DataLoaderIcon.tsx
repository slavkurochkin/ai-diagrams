interface IconProps {
  size?: number
  className?: string
}

// Cloud shape (external data source) with a downward arrow flowing into an inbox tray.
// Cloud = external origin (files, APIs, S3, URLs).
// Down arrow + tray = data being ingested into the pipeline.
export default function DataLoaderIcon({ size = 24, className }: IconProps) {
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
      {/* Cloud outline — two arcs forming bumpy top, flat bottom
          Left side goes up, hits three arc bumps across the top, comes back down */}
      <path d="M4 13 L4 11 A3 3 0 0 1 8.5 8 A3 3 0 0 1 15.5 8 A3 3 0 0 1 20 11 L20 13" />
      <line x1="4" y1="13" x2="20" y2="13" />

      {/* Downward ingestion arrow */}
      <line x1="12" y1="13" x2="12" y2="18" />
      <polyline points="9.5,16 12,19 14.5,16" />

      {/* Tray / landing zone at bottom */}
      <path d="M3 19 H9 V21 H15 V19 H21" />
    </svg>
  )
}
