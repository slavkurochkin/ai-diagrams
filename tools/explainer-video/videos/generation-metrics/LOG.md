# Generation metrics video (metrics series 3) — log

What was made, what changed between versions, and why. Newest first. Add an entry for every re-render
that changes what viewers see or hear, so the video can be revised later without guessing.

- **Scenario:** [`video.mjs`](video.mjs) (every scene, line, action, highlight, and character beat)
- **Transcript:** [`transcript.md`](transcript.md), regenerated on every render
- **Renderer:** `app.mjs` in AgentFlow mode (`setup.app: 'agentflow'`): drives the real Generation Metrics Visualizer
- **Follow-up to:** [`llm-judge`](../llm-judge/LOG.md) (Priya returns; that video ends with a teaser for this one)
- **Render:** `node app.mjs generation-metrics` → `out/generation-metrics/generation-metrics.mp4` (needs `npm run dev` running)

## Current version — v1 (2026-10-05) · 5:10

Priya's retrieval scores look great, yet users still get wrong answers. She grades the answer itself on Leo's
"What about monthly ones?". The prelude loads the RAG Evaluation template and fits it to the screen; the video
selects the RAG Evaluator and opens "Visualize Faithfulness / Relevancy"
(`src/components/panels/GenerationEvalPanel.tsx`, model in `src/lib/generationMetrics.ts`).

| Step | What happens on screen | Numbers |
|---|---|---|
| Retrieval is only half | canvas: Retriever (video 1), Answer LLM (this video), RAG Evaluator | — |
| 01 Faithfulness | 5 chunks → "Split into claims" → "Check each claim" | 3 ÷ 3 = 1.00 |
| 02 Catching a hallucination | answer adds a prorated refund (contradicted) and "5 business days" (invented) | 2 ÷ 4 = 0.50 |
| 03 True isn't enough | "you can cancel from the mobile app": maybe true, but in no chunk | 3 ÷ 4 = 0.75 |
| 04 Faithful, but wrong | answer about annual plans, backed by a chunk | 1.00, but off-topic |
| 05 Answer relevancy | questions generated from the answer vs. the real one | 0.93 · off-topic 0.47 · made-up still 0.90 |
| 06 Context recall | the golden set's 3 must-include facts in the chunks; then a chunk goes missing | 3/3 = 1.00 → 2/3 = 0.67 |
| 07 Context precision | useful chunks at ranks 1–2, then 3 and 5 | 1.00 → (1/3 + 2/5) ÷ 2 = 0.37, recall still 1.00 |
| 08 Where did it go wrong? | Diagnose tab: generator vs. retriever tiles, 4 cases | made up → faithfulness; missed → recall; misread follow-up → relevancy + precision |
| Grading the answer | checklist card | — |

The outro is "Faithfulness · Answer relevancy · Context recall · Context precision": metrics only (claims are a step inside faithfulness, the same rule as video 1's @k).

## History

### v1.1 (2026-10-06)
- **Outro:** "Claims" was removed from the summary list. The user flagged in video 1 that a summary should list
  only metrics ("@k is not a metric on its own"), and claims are a step inside faithfulness, not a metric.

### v1 (2026-10-05)
- **Request:** while reviewing video 2, the user noted nothing covered faithfulness or hallucinations. They
  agreed those belong in video 3, the generation metrics follow-up the series had already planned.
- **App changes:** a new Generation Metrics Visualizer, opened from the RAG Evaluator's settings, with four tabs:
  faithfulness, answer relevancy, context recall & precision, and diagnose. Its model is
  `generationMetrics.ts`, and the claims, verdicts, and similarities are worked examples written in advance.
  Tests cover it.
- **Fixes after the stills review:**
  - Zooming in cut off the wide RAG pipeline, so the prelude only fits the view.
  - The faithfulness score dropped behind the caption, so the question moved into the chunks heading and
    claim notes became single lines.
  - In the context-recall scene, two labels stacked on each other; they are now staggered.
