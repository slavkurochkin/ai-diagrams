# LLM-as-a-judge video (metrics series 2) — log

What was made, what changed between versions, and why. Newest first. Add an entry for every re-render
that changes what viewers see or hear, so the video can be revised later without guessing.

- **Scenario:** [`video.mjs`](video.mjs) (every scene, line, action, highlight, and character beat)
- **Transcript:** [`transcript.md`](transcript.md), regenerated on every render
- **Renderer:** `app.mjs` in AgentFlow mode (`setup.app: 'agentflow'`): drives the real LLM Judge Visualizer
- **Follow-up to:** [`retrieval-metrics`](../retrieval-metrics/LOG.md) (Priya returns)
- **Render:** `node app.mjs llm-judge` → `out/llm-judge/llm-judge.mp4` (needs `npm run dev` running)

## Current version — v5 (2026-10-06) · 9:38

Priya asks who checks the grader. The whole video uses one analogy: a judge is a teacher grading essays. It
needs an answer key (the **golden dataset**) and a marking scheme (the **rubric**), and then the grader itself
gets checked. It opens on the canvas (fit view, plus one zoom step) to show where the judge sits, then opens
the visualizer (`src/components/panels/JudgePanel.tsx`, model in `src/lib/judge.ts`).

| Step | What happens on screen | Numbers |
|---|---|---|
| Where the judge sits | canvas: Model Under Test, then LLM Judge | — |
| Why a judge | canvas: Ground Truth = answer key, Rubric = marking scheme | — |
| 01 The answer key | "Answer key" tab: one golden example (conversation, question, reference, must-include facts, source, author) | — |
| 02 Building it | "Next step" walks the 5 steps: real questions → balanced mix → expert references → people's labels → split/version/grow | 50–200 to start |
| 03 Synthetic data | "Synthetic data" tab: a doc chunk → Generate (5 drafts: from the doc, reworded, trap, "docs don't say") → a person reviews (2 rejected, with reasons) → real vs. synthetic pass rate | 78% vs. 94% |
| 04 The rubric | "Show the prompt": what the judge sees (question, reference, answer, rubric definitions) and its JSON reply | 7 ÷ 7 = 1.00 |
| 05 Weights | no citation, then confident guess | 3+2+1+1 = 7 points · 5/7 = 0.71 · 1/7 = 0.14 |
| 06 Pass or fail? | 0–1 → 1–5 → pass/fail | 0.71 · 4 · Fail (mark 0.75) |
| 07 Blind spots | padded answer, "Concise" toggled off | 0.86 → 1.00 |
| 08 Noise | 5 runs with an average line → "Show the math" (average, distances, square + average, √) → fix 1 pin (temp 0, fixed version) → fix 2 average the runs (sd ÷ √5) | std dev √0.4 = 0.63 → pinned 0 · average of 5: 0.28 |
| 09 Judge bias | "Is it biased?" tab: Priya's old prompt (A) vs. new prompt (B), judge both orders, then the bias list | old first → old, new first → new → tie |
| 10 Can we trust it? | "Three questions" buttons; question 1: a colleague graded 12 answers by hand ("person" column) vs. the judge | v1 75% |
| 11 Fix the rubric | Rubric v2 | 92% |
| 12 Better than guessing? | question 2: lazy judge "right 8 of 12 for free" = chance; kappa = how much better than chance | 67% = chance → κ 0 · v2 κ 0.80 (aim ≥ 0.6) |
| 13 Enough labels? | question 3: points per answer, the formula 2 × √(p(1 − p) ÷ n), a range bar; 12 → 200 labels | 8 points each, 92 → 83 · ± 16 (76–100%) → ± 4 (88–96%) |
| A judge you can trust | checklist card mirroring the three questions, then the video 3 teaser | 100–200 labels, κ ≥ 0.6 |

The outro is "Golden set · Rubric · Noise · Bias · Agreement · Kappa · Margin of error".

## History

### v5 (2026-10-06)
- **Feedback on v4:**
  - "on standard deviation, it tells about it, but it does not explain how we got the number, also after that
    the fix is not exampled, maybe we should some visual".
  - "I like the pairwise example but not sure it is connected properly to the context".
  - "when it asks remember 12 questions from step 4, no I dont remeber".
  - "when you talk about error mergin, you need expand and explain better I have no idea where you get those
    number from".
- **Standard deviation:**
  - It's now worked out on screen in four steps: average, distances, square and average, square root.
  - It switched to the plain average (÷ n), giving √0.4 = 0.63, so there is no n − 1 to explain.
  - The bars got an average line.
  - Each fix has its own visual. Pinning (fixed version, temperature 0) gives std dev 0. Averaging 5 runs
    gives 0.63 ÷ √5 = 0.28, which is the fix for models that can't be pinned.
- **Pairwise:** it moved to its own "Is it biased?" tab and became part of Priya's story: her old prompt against
  a new one, where position bias would make her switch, or stay, for the wrong reason.
- **Labels:** the step-4 callback was dropped. The video now says on the spot that a colleague graded the 12
  answers by hand (the "person" column).
- **Margin of error:**
  - It shows what each answer is worth (100% ÷ 12 ≈ 8 points; one more disagreement turns 92% into 83%).
  - The formula 2 × √(p(1 − p) ÷ n) is shown with the numbers filled in.
  - A range bar shows 76–100% for 12 labels and 88–96% for 200.
  - `marginOfError` now uses 2 (1.96, rounded), so the formula on screen gives the displayed numbers exactly.
- **Kappa scene:** it now starts on the lazy judge, still on question 1. Chance and kappa appear only when the
  narration reaches them, so version 2's 0.80 no longer shows early.
- **Panel:** widened to `max-w-3xl` to fit six tabs.

### v4 (2026-10-06) · 8:34
- **Feedback:** "for llm-judge video last third of the video seems to be hard to follow, review the script see if
  anything can be done to improve and reduce cognetive load".
- **Diagnosis:**
  - About 13 numbers landed in under two minutes.
  - The trust tab showed agreement, margin of error, chance, kappa, and the formula all at once, before the
    narration reached them.
  - Three different checks ran together with no signposting.
  - "Chance" was explained abstractly ("a judge guessing at random, but saying pass just as often").
- **Changes:**
  - **Three numbered questions:** the last third is now "Agrees with people?", "Better than guessing?", and
    "Enough labels?". The trust tab gained a "Three questions" button row, and each question shows only its
    own numbers (no button pressed = everything, as before).
  - **Chance made concrete:** the lazy judge is "right 8 times out of 12, for free"; kappa is "how much better
    than chance".
  - **Fewer numbers in the narration:** the formula is no longer read aloud, and "a hundred at least, two
    hundred is better" became "a hundred to two hundred".
  - **Closing card:** it now mirrors the three questions, and the narration is shorter.
  - **Summary:** cut from 8 words to 7 (Golden set · Rubric · Noise · Bias · Agreement · Kappa · Margin of
    error).
- **Length:** 9:01 → 8:34.

### v3 (2026-10-05) · 9:01
- **Feedback on v2:** "I like it but there is nothing about faitfulness, or bias, or halucinations, also there no
  mentioning of statistical diviation … Also the golden data set does not say anything about synthetic data
  generation".
- **Decision (agreed with the user):**
  - Things about the judge itself go in this video: synthetic data, standard deviation, margin of error, and
    the list of judge biases.
  - Faithfulness and hallucinations are what the judge *measures*, so they go to video 3 (generation metrics).
    This video now ends with a teaser for it.
  - Significance testing between model versions, and fairness bias in the model being tested, are left for
    possible later videos.
- **App changes:**
  - New "Synthetic data" tab (generate → review → real-vs-synthetic gap).
  - Standard deviation on the consistency tab, plus a "Common judge biases" table.
  - Margin of error with a 12/200-labels toggle on the trust tab.
  - `judge.ts` gained `SOURCE_CHUNK`, `SYNTHETIC_QUESTIONS`, `REAL_VS_SYNTHETIC`, `stdDev`, `marginOfError`,
    and `JUDGE_BIASES`.

### v2 (2026-10-05) · 6:55
- **Feedback:** "I dont think explanation is clear enough for video 2, make it easy to understand. Also how
  come you never mention anything about golden data set and how you get it".
- **Clarity:**
  - The whole video uses one analogy (teacher, answer key, marking scheme), with one idea per caption.
  - A canvas opening shows where the judge sits in the pipeline.
  - The judge's real prompt and JSON reply are shown before the verdicts.
  - Weights are said as points ("3 + 2 + 1 + 1 = 7").
  - Kappa is shown as a gap above chance, with a "By chance" stat and the formula with numbers.
- **Golden dataset:**
  - A new first tab, "Answer key", shows one golden example and the five steps to build a set.
  - The human labels used in the trust check are tied back to step 4.
- **App changes:**
  - `judge.ts`: `GOLDEN_EXAMPLE` and `GOLDEN_STEPS`; criterion definitions; `judgePrompt` / `judgeReply`;
    the `chance` field in `agreementWithHumans`.
  - Panel: the new tab, the prompt toggle, and chance plus the formula. The 2×2 table was dropped as clutter.
  - The panel takes an `initialTab` prop for tests.

### v1 (2026-10-05) · 4:40
- **Request:** the user asked for a visual for LLM-as-a-judge "to easy understand, similar to how we did for
  video 1", as part 2 of the metrics series.
- **App changes:** new LLM Judge Visualizer (three tabs: grade, consistency, trust) opened from the LLM Judge
  node's settings; deterministic worked examples in `judge.ts` with tests (verdicts are written in advance —
  the visualizer teaches the mechanics, it does not call a model).
- **Stills review:** all frames matched their captions. Known nit: in the position-bias scene the highlight
  label briefly covers the small "run 1–5" captions.
