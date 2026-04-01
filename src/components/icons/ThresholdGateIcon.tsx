import type { IconProps } from './index'

export default function ThresholdGateIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Gauge arc */}
      <path d="M5.5 18.5A8 8 0 0 1 12 4a8 8 0 0 1 6.5 14.5" />
      {/* Threshold tick marks */}
      <path d="M12 4v2" />
      <path d="M4.5 12H6.5" />
      <path d="M17.5 12H19.5" />
      {/* Needle pointing to threshold */}
      <path d="M12 12l-3.5-4" strokeWidth={2} />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      {/* Pass/fail tick */}
      <path d="M15.5 8.5l1-1" />
    </svg>
  )
}
