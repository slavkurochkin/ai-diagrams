interface IconProps {
  size?: number
  className?: string
}

// Funnel / triangle pointing right (many inputs → one decision) with three labeled
// output lines exiting the tip. The funnel communicates "narrowing to a category."
// Three output lines = discrete classification labels (ClassA, ClassB, ClassC).
// Distinct from Router: Classifier produces a label, Router acts on one.
export default function ClassifierIcon({ size = 24, className }: IconProps) {
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
      {/* Funnel / triangle — points right, converging to the tip at (12, 12) */}
      <path
        d="M3 5 L3 19 L12 12 Z"
        fill="currentColor"
        fillOpacity={0.15}
      />

      {/* Three classification output lines */}
      <line x1="12" y1="7" x2="21" y2="7" />
      <line x1="12" y1="12" x2="21" y2="12" />
      <line x1="12" y1="17" x2="21" y2="17" />

      {/* Class label dots — the discrete output categories */}
      <circle cx="14.5" cy="7" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="17" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}
