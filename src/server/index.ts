import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { explainRouter } from './routes/explain.js'
import { evalSuggestionsRouter } from './routes/evalSuggestions.js'
import { designReviewRouter } from './routes/designReview.js'

const app = express()
const PORT = 3001

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

app.use('/api', explainRouter)
app.use('/api', evalSuggestionsRouter)
app.use('/api', designReviewRouter)

app.listen(PORT, () => {
  console.log(`[AgentFlow server] listening on http://localhost:${PORT}`)
})
