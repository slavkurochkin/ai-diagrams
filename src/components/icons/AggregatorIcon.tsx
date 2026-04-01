interface IconProps {
  size?: number
  className?: string
}

// Two input lines converging to a merge point, then a single output arrow.
// The structural inverse of RouterIcon — if Router splits, Aggregator joins.
// Used for fan-in patterns: map-reduce, ensemble LLM calls, multi-agent merges.
export default function AggregatorIcon({ size = 24, className }: IconProps) {
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
      {/* Two converging input lines */}
      <line x1="2" y1="7" x2="11.5" y2="12" />
      <line x1="2" y1="17" x2="11.5" y2="12" />

      {/* Merge point */}
      <circle cx="12" cy="12" r="1.75" fill="currentColor" fillOpacity={0.2} />

      {/* Single output arrow */}
      <line x1="13.75" y1="12" x2="21" y2="12" />
      <polyline points="19,10 21,12 19,14" />
    </svg>
  )
}
