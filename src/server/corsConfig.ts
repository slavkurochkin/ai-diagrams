/**
 * CORS for dev (Vite on :5173 + API on :3001) and prod (explicit allowlist or same-origin-only).
 */

const DEV_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'] as const

export function getCorsOriginOption():
  | boolean
  | string[]
  | ((origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => void) {
  const raw = process.env.CORS_ORIGINS?.trim()
  if (raw) {
    const list = raw.split(',').map((s) => s.trim()).filter(Boolean)
    if (list.length === 0) return false
    return list
  }

  if (process.env.NODE_ENV === 'production') {
    // Same-origin SPA (Express serves dist): browsers don’t need CORS for /api.
    // Empty allowlist = omit permissive cross-origin headers (see server index).
    return false
  }

  return [...DEV_ORIGINS]
}

export function shouldEnableCorsMiddleware(): boolean {
  const raw = process.env.CORS_ORIGINS?.trim()
  if (raw) return true
  return process.env.NODE_ENV !== 'production'
}
