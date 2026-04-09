import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { explainRouter } from './routes/explain.js'
import { evalSuggestionsRouter } from './routes/evalSuggestions.js'
import { designReviewRouter } from './routes/designReview.js'
import { shouldEnableCorsMiddleware, getCorsOriginOption } from './corsConfig.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
const PORT = Number(process.env.PORT ?? 3001)
const isProd = process.env.NODE_ENV === 'production'

if (isProd) {
  app.set('trust proxy', 1)
}

app.get('/health', (_req, res) => {
  res.set('Cache-Control', 'no-store')
  res.json({ ok: true })
})

if (shouldEnableCorsMiddleware()) {
  app.use(cors({ origin: getCorsOriginOption(), credentials: false }))
}

const bodyLimit = process.env.JSON_BODY_LIMIT ?? '1mb'
app.use(express.json({ limit: bodyLimit }))

const windowMs = Number(process.env.API_RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000)
const maxRequests = Number(process.env.API_RATE_LIMIT_MAX ?? 60)
const apiLimiter = rateLimit({
  windowMs: Number.isFinite(windowMs) && windowMs > 0 ? windowMs : 15 * 60 * 1000,
  max: Number.isFinite(maxRequests) && maxRequests > 0 ? maxRequests : 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests to the AI API. Try again later.' },
})

app.use('/api', apiLimiter)

app.use('/api', explainRouter)
app.use('/api', evalSuggestionsRouter)
app.use('/api', designReviewRouter)

if (isProd) {
  const distDir = path.join(__dirname, '../../dist')
  app.use(express.static(distDir, { index: false }))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next()
    }
    res.sendFile(path.join(distDir, 'index.html'), (err) => {
      if (err) next(err)
    })
  })
}

app.use(
  (
    err: Error & { status?: number },
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error('[AgentFlow server]', err)
    res.status(err.status ?? 500).json({ error: isProd ? 'Internal server error' : err.message })
  },
)

app.listen(PORT, () => {
  console.log(
    `[AgentFlow server] listening on http://localhost:${PORT} (${isProd ? 'production' : 'development'})`,
  )
})
