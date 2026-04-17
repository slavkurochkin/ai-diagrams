import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { explainRouter } from './routes/explain.js'
import { evalSuggestionsRouter } from './routes/evalSuggestions.js'
import { designReviewRouter } from './routes/designReview.js'
import { successRisksRouter } from './routes/successRisks.js'
import { workflowBuildRouter } from './routes/workflowBuild.js'
import { parallelJudgeRouter } from './routes/parallelJudge.js'
import { flowContextSynthesizeRouter } from './routes/flowContextSynthesize.js'
import { PROVIDERS, type Provider } from './lib/llmProvider.js'

const app = express()
const PORT = 3001

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

app.use('/api', explainRouter)
app.use('/api', evalSuggestionsRouter)
app.use('/api', designReviewRouter)
app.use('/api', successRisksRouter)
app.use('/api', workflowBuildRouter)
app.use('/api', parallelJudgeRouter)
app.use('/api', flowContextSynthesizeRouter)

app.get('/api/provider', (_req, res) => {
  const provider = (process.env.LLM_PROVIDER ?? 'openai') as Provider
  const cfg = PROVIDERS[provider]
  const model = (cfg ? (process.env[cfg.modelEnv] ?? cfg.defaultModel) : 'gpt-4o')
  res.json({ provider, model })
})

app.listen(PORT, () => {
  console.log(`[AgentFlow server] listening on http://localhost:${PORT}`)
})
