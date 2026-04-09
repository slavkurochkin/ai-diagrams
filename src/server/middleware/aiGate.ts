import type { RequestHandler } from 'express'

/**
 * In production, server-side AI (your OpenAI bill) only runs when
 * `ENABLE_SERVER_AI=true`. Local dev does not require this flag.
 */
export const requireServerAiEnabled: RequestHandler = (_req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    return next()
  }
  if (process.env.ENABLE_SERVER_AI === 'true') {
    return next()
  }
  return res.status(403).json({
    error: 'AI features are disabled on this deployment.',
    hint: 'Set ENABLE_SERVER_AI=true on the host when you are ready to fund API usage (e.g. paid tier).',
  })
}
