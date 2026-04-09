import type { RequestHandler } from 'express'

const MAX_NODES = 400
const MAX_EDGES = 1200

/** Reject oversized diagrams before they hit the model (saves tokens and abuse surface). */
export const graphBodyLimits: RequestHandler = (req, res, next) => {
  const nodes = req.body?.nodes
  const edges = req.body?.edges
  if (!Array.isArray(nodes) || !Array.isArray(edges)) {
    return next()
  }
  if (nodes.length > MAX_NODES) {
    return res.status(413).json({ error: `Too many nodes (max ${MAX_NODES} for AI features)` })
  }
  if (edges.length > MAX_EDGES) {
    return res.status(413).json({ error: `Too many edges (max ${MAX_EDGES} for AI features)` })
  }
  next()
}
