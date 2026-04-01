interface IconProps {
  size?: number
  className?: string
}

// Document with folded corner. Two content lines at the top.
// Curly brace pair at the bottom with placeholder dots — immediately reads as a template.
export default function PromptTemplateIcon({ size = 24, className }: IconProps) {
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
      {/* Document outline with folded top-right corner */}
      <path d="M5 2 H16 L19 5 V22 H5 Z" />
      {/* Fold detail */}
      <path d="M16 2 L16 5 H19" />

      {/* Content lines — top section */}
      <line x1="8" y1="8" x2="16" y2="8" />
      <line x1="8" y1="11" x2="13" y2="11" />

      {/* Left curly brace { */}
      <path d="M9.5 14.5 C9 14.5 8.5 14.8 8.5 15.5 L8.5 16.5 C8.5 17 8 17.5 7.5 17.5 C8 17.5 8.5 18 8.5 18.5 L8.5 19.5 C8.5 20.2 9 20.5 9.5 20.5" />

      {/* Right curly brace } */}
      <path d="M14 14.5 C14.5 14.5 15 14.8 15 15.5 L15 16.5 C15 17 15.5 17.5 16 17.5 C15.5 17.5 15 18 15 18.5 L15 19.5 C15 20.2 14.5 20.5 14 20.5" />

      {/* Placeholder dots between braces — { ··· } */}
      <circle cx="11" cy="17.5" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="12.5" cy="17.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}
