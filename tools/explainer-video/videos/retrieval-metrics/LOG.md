# Retrieval metrics video (metrics series 1) — log

What was made, what changed between versions, and why. Newest first. Add an entry for every re-render
that changes what viewers see or hear, so the video can be revised later without guessing.

- **Scenario:** [`video.mjs`](video.mjs) (every scene, line, action, highlight, and character beat)
- **Transcript:** [`transcript.md`](transcript.md), regenerated on every render
- **Renderer:** `app.mjs` in AgentFlow mode (`setup.app: 'agentflow'`): drives the real RAG Eval Visualizer
- **Follow-up to:** [`conversational-rag-eval`](../conversational-rag-eval/LOG.md) (Priya returns; that video's bridge scene promised this one)
- **Render:** `node app.mjs retrieval-metrics` → `out/retrieval-metrics/retrieval-metrics.mp4` (needs `npm run dev` running)

## Current version — v1 (2026-10-05) · 4:05

Priya's eval report is full of numbers, and she works them out on one running example: Leo's "What about
monthly ones?". Two relevant documents exist, and the retriever returns 5 chunks with only rank 1 relevant.
Everything happens live in the visualizer:

| Step | What happens on screen | Numbers |
|---|---|---|
| 01 Precision@5 | only rank 1 is green | 1 / 5 = 20% |
| 02 Recall@5 | one relevant doc shows as "missed" | 1 / 2 = 50% |
| 03 F1@5 | harmonic mean vs. a plain average | ≈ 29% (an average would say 35%) |
| 04 What @k does | k goes 5 → 10, and rank 7 is the second relevant doc | recall 100%, precision 20% (2 / 10) |
| 05 MRR | k back to 5; the hit moves from rank 1 to rank 4 | precision and recall unchanged; MRR 1 → 0.25 |
| 06 NDCG | hits at ranks 4 and 5, then at ranks 1 and 2 | P 40%, R 100% both times; NDCG ≈ 0.50 → 1.0 |
| Which metric when | the card on a clean canvas | recall@20 on candidates, precision@5 on the prompt, F1, MRR vs. NDCG |

The outro is "Precision · Recall · F1 · @k · MRR · NDCG".

## History

### v1 (2026-10-05)
- **Request:** a metrics deep dive. The conversational-rag-eval video only named recall and precision, and said
  nothing about @k or F1. The user agreed to a series; this is part 1, with Priya returning.
- **Renderer:** `app.mjs` gained an AgentFlow mode. It starts no MCP servers, opens `APP_URL`, and runs a hidden
  `prelude` of clicks before recording: dismiss "Set up your flow", load the RAG Evaluation template, open
  the visualizer, and set the running example.
- **App changes for the walkthrough:**
  - Visualizer controls got accessible names (stepper buttons, rank chunks, close).
  - Metric rows and sections got `data-` hooks.
  - The visualizer is more compact, so every metric row fits a 720 px-tall screen.
  - F1 was added to its subtitle.
- **Fixes after the stills review:**
  - MRR and NDCG were scrolled out of view in the MRR scene, so the visualizer was compacted.
  - The closing card overlapped the node's settings panel, so the closing scene now deselects the node.
