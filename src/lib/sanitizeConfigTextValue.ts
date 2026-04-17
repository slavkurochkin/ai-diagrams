import type { ConfigField } from '../types/nodes'

/**
 * For text/textarea fields that list {@link ConfigField.rejectTrimmedCaseInsensitive}:
 * if the trimmed value equals any blocked token (case-insensitive), store empty string.
 */
export function sanitizeConfigTextValue(field: ConfigField, raw: string): string {
  if (field.type !== 'text' && field.type !== 'textarea') return raw
  const blocked = field.rejectTrimmedCaseInsensitive
  if (!blocked?.length) return raw
  const t = raw.trim().toLowerCase()
  if (blocked.some((b) => t === b.toLowerCase())) return ''
  return raw
}
