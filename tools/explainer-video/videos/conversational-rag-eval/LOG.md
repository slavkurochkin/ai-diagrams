# Conversational RAG Eval video (evaluation deep dive) — log

What was made, what changed between versions, and why. Newest first. Add an entry for every re-render
that changes what viewers see or hear, so the video can be revised later without guessing.

- **Scenario:** [`video.mjs`](video.mjs) (every scene, line, card, and character beat)
- **Transcript:** [`transcript.md`](transcript.md), regenerated on every render
- **Template:** `conversational-rag-eval` in `src/lib/templates.ts` (hand-placed layout added for this video)
- **Follow-up to:** [`conversational-rag`](../conversational-rag/LOG.md) (Leo's conversation is one of the test cases)
- **Render:** `node render.mjs conversational-rag-eval` → `out/conversational-rag-eval/conversational-rag-eval.mp4`

## Current version — v1 (2026-10-05) · 8:30

Priya (long black hair, glasses, coral hoodie), the AI engineer who owns Cloudly's support assistant, is about to ship
a new search index that's twice as fast. Her worries: will follow-ups still work, and could a customer see
internal documents? The eval replays scripted conversations, and every check shows **how** it decides, with
a worked example:

| Step | Worked example |
|---|---|
| 01 The test set | anatomy of one scripted turn: message, expected rewrite, relevant docs, reference, restricted facts |
| 02 Two loops | conversations in parallel with fresh memory; turns in order so follow-ups can resolve |
| 03 Answer key stays hidden | only the message reaches the pipeline; a test fails the build otherwise |
| 04 Same pipeline as production | drift test, frozen index snapshot, access groups → retriever filter |
| 05 Follow-up rewriting | "What about monthly ones?": good rewrite → 1; unchanged or "monthly plan pricing" → 0 |
| 06 Retrieval | doc 2 in the top 20 but not the top 5 = reranker problem; not in the 20 = retriever or index problem |
| 06 Recall, precision, F1 | 2 relevant docs, 1 in the top 5 → Recall@5 50%, Precision@5 20%, F1@5 ≈ 29%; what “@5” means |
| 07 Answer vs reference | "Is there a fee for exporting?": "don't know" → 1; "it's free" (a guess) → 0 |
| 08 Access checks | retrieval check, a substantive canary ("61 days"), and a leak judge that catches paraphrases |
| 09 Memory & consistency | "I'm on Pro" on turn 1, then "going back to my plan" on turn 3 |
| 10 Latency | message to first token, rewriting and reranking included; 1.5 s budget |
| 11 Three gates | quality ≥ 0.85, zero leaks (1 in 1,000 = 99.9% would vanish if averaged), ≥ 95% within budget |

**Story beats:**
- **First run:** the access gate fails with 2 leaks. A role-claim turn paraphrased the internal 60-day
  exception. The canary passed, but the leak judge caught it. The cause: the new index lost its access-group labels.
- **Fixed:** the index is rebuilt with the labels, all three gates pass, and Priya ships, happy.

The outro is "Script · Replay · Rewrite · Retrieve · Answer · Protect · Gate".

## History

### v1 (2026-10-05)
- **Request:** "create evaluations explainer now". The user chose a new character, Priya the engineer, and a story
  where the first run fails and the re-run passes.
- **Template fix first:** the eval template had no positions, and its auto-layout of 32 nodes was unreadable
  (crossing loop-back lines, the character stranded mid-canvas). It now has a hand-placed lane layout:
  - test data and loops
  - the pipeline (mirroring the shipped Conversational RAG)
  - answer-key extractors and per-turn scorers below
  - the conversation judge, then the gates, then the report and alert, with Priya beside them
- **The story comes from real results.** The paraphrased leak that the canary missed came from the synthetic dry run in
  `tools/rag-eval-dryrun`, where it also led to the template's leak judge.
- **Feedback before publishing (same day):**
  - "You need to expand on evals, like explain what is recall and what is precision, how it is evaluated @k, and
    also nothing said about F1." The decision: a ~50 s bridge scene, "Recall, precision & F1", with one worked
    example. The full math, plus MRR and NDCG, gets a dedicated follow-up video so this one keeps its story.
  - "Priya looks like Becky." She had Becky's build, teal blazer colours and earrings. She's now long black hair,
    glasses and a coral hoodie, differing from Becky (teal blazer) and Leo (short hair, purple hoodie) on
    several features at once.
- **Fixes after the stills review:**
  - Scenes 05, 06, 07 and 10 framed only their scorers; the pipeline nodes far above made them too small.
  - Scene 11 includes Priya, because a huge dimmed Priya sat behind the card otherwise.
