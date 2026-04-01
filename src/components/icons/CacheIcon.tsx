interface IconProps {
  size?: number
  className?: string
}

// Lightning bolt (speed / instant hit) on the left + small cylinder (storage) on the right.
// Together they communicate: "fast retrieval from storage — bypasses the LLM."
// The bolt is the dominant shape so it reads clearly at 16px.
export default function CacheIcon({ size = 24, className }: IconProps) {
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
      {/* Lightning bolt — the dominant "speed" symbol
          Classic zigzag: top-right → down-left → horizontal right → down-left again */}
      <path
        d="M12 2 L6 12 L10 12 L8 22 L16 11 L12 11 Z"
        fill="currentColor"
        fillOpacity={0.15}
      />

      {/* Small cylinder (cache storage) — top-right area
          Positioned so it peeks from behind the bolt */}
      <ellipse cx="19" cy="8" rx="3" ry="1.5" />
      <line x1="16" y1="8" x2="16" y2="14" />
      <line x1="22" y1="8" x2="22" y2="14" />
      <ellipse cx="19" cy="14" rx="3" ry="1.5" />
    </svg>
  )
}
