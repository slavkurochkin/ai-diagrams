import type { IconProps } from './index'

export default function EvalMetricsIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Bars */}
      <path d="M6 20V14" />
      <path d="M12 20V8" />
      <path d="M18 20V4" />
      {/* Baseline */}
      <path d="M2 20h20" />
      {/* Trend line */}
      <path d="M5 15l7-8 6-3" strokeDasharray="1.5 1.5" />
    </svg>
  )
}
