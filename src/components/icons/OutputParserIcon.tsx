interface IconProps {
  size?: number
  className?: string
}

// Single curly brace { (raw LLM text) → arrow → 2x2 grid (structured data extracted).
// Communicates the transformation from unstructured text to typed fields.
// Distinct from PromptTemplate: direction is reversed (output, not input),
// and the result is a structured grid rather than a document.
export default function OutputParserIcon({ size = 24, className }: IconProps) {
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
      {/* Left curly brace — represents raw LLM text output */}
      <path d="M11 4 C10 4 9 4.5 9 6 L9 9.5 C9 10.5 8 11 7.5 12 C8 13 9 13.5 9 14.5 L9 18 C9 19.5 10 20 11 20" />

      {/* Transformation arrow */}
      <line x1="12.5" y1="12" x2="15" y2="12" />
      <polyline points="13.5,10.5 15,12 13.5,13.5" />

      {/* 2x2 structured data grid */}
      <rect x="16" y="7.5" width="6" height="9" rx="1" />
      <line x1="19" y1="7.5" x2="19" y2="16.5" />
      <line x1="16" y1="12" x2="22" y2="12" />
    </svg>
  )
}
