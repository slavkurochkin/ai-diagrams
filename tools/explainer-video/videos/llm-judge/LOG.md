# LLM-as-a-judge video (metrics series 2) — log

What was made, what changed between versions, and why. Newest first. Add an entry for every re-render
that changes what viewers see or hear, so the video can be revised later without guessing.

- **Scenario:** [`video.mjs`](video.mjs) (every scene, line, action, highlight, and character beat)
- **Transcript:** [`transcript.md`](transcript.md), regenerated on every render
- **Renderer:** `app.mjs` in AgentFlow mode (`setup.app: 'agentflow'`): drives the real LLM Judge Visualizer
- **Follow-up to:** [`retrieval-metrics`](../retrieval-metrics/LOG.md) (Priya returns)
- **Render:** `node app.mjs llm-judge` → `out/llm-judge/llm-judge.mp4` (needs `npm run dev` running)

## Current version — v1 (2026-10-05) · 4:40

Priya's eval report leans on LLM judges, so she checks how far to trust them. The prelude loads the LLM
Evaluation Pipeline, selects its LLM Judge, and opens the visualizer (`src/components/panels/JudgePanel.tsx`,
model in `src/lib/judge.ts`). The example is Leo's "What about monthly ones?" with a reference answer.

| Step | What happens on screen | Numbers |
|---|---|---|
| 01 A rubric, not a vibe | per-criterion verdicts with reasons, grounded answer | 7 ÷ 7 = 1.00 |
| 02 Weights | no citation, then confident guess | 5 ÷ 7 = 0.71 · 1 ÷ 7 = 0.14 |
| 03 The scale | 0–1 → 1–5 → pass/fail (pass mark 0.75) | 0.71 · 4 · Fail |
| 04 What you leave out | padded answer; "Concise" toggled off | 0.86 → 1.00 |
| 05 Noise | 5 repeat runs, then "Pin the judge" | 4,5,4,3,4 → 4 ×5 |
| 06 Position bias | pairwise, then "Judge both orders" | A first → A, B first → B → tie |
| 07 Check against humans | 12 human-labeled answers, red rows = disagreement | v1: 75%, κ 0.40 |
| 08 Fix the rubric | Rubric v2 | 92%, κ 0.80 |
| 09 Why kappa | lazy judge passes everything | 67%, κ 0 |
| A judge you can trust | checklist card on a clean canvas | κ ≥ 0.6 rule of thumb |

The outro is "Rubric · Weights · Scale · Noise · Bias · Agreement".

## History

### v1 (2026-10-05)
- **Request:** the user asked for a visual for LLM-as-a-judge "to easy understand, similar to how we did for
  video 1", as part 2 of the metrics series.
- **App changes:** new LLM Judge Visualizer (three tabs: grade, consistency, trust) opened from the LLM Judge
  node's settings; deterministic worked examples in `judge.ts` with tests (verdicts are written in advance —
  the visualizer teaches the mechanics, it does not call a model).
- **Stills review:** all frames matched their captions. Known nit: in the position-bias scene the highlight
  label briefly covers the small "run 1–5" captions.
