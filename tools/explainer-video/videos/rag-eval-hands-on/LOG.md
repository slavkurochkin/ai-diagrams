# Hands-on RAG evals with DeepEval — log

What was made, what changed between versions, and why. Newest first. Add an entry for every re-render
that changes what viewers see or hear, so the video can be revised later without guessing.

> **Replaced by [`rag-eval-promptfoo`](../rag-eval-promptfoo/LOG.md)** (2026-10-06). The user found this cut hard to follow:
> what the assistant does and what a test checks weren't clear, and the terminal tables were hard to read. Kept for reference.

- **Scenario:** [`video.mjs`](video.mjs)
- **Transcript:** [`transcript.md`](transcript.md), regenerated on every render
- **Renderer:** `app.mjs` in terminal mode (`setup.app: 'terminal'`). Commands run in the `cloudly-support-rag`
  demo (`~/Documents/dev/cloudly-support-rag`, override with `DEMO_DIR`).
- **Needs:** in the demo, Postgres running (`docker compose up -d`), the corpus indexed (`uv run python -m rag.index`),
  and `ANTHROPIC_API_KEY` in its `.env` (git-ignored). Every render makes real Claude calls (about $0.60), and so does
  every stills run.
- **Render:** `node app.mjs rag-eval-hands-on` → `out/rag-eval-hands-on/rag-eval-hands-on.mp4`

## Current version — v1 (2026-10-06) · 5:04

Nina (a new character: short auburn hair, mustard blazer, earrings, no glasses), a QA engineer at Cloudly, must sign
off on a change to the support assistant. Everything on screen is real output:

| Scene | Command | What it shows |
|---|---|---|
| Meet Nina | `grep -H "^access:" corpus/*.md` | 8 docs: 6 public, 2 internal |
| 01 The assistant | `rag.chat … --then "What about monthly ones?"` | the rewrite, the kept chunks, cited answers, ~1¢ |
| 02 Golden dataset | `jq '.conversations[2].turns[0]'` | message, relevant docs, reference, forbidden fact, canaries (exam answer-key analogy) |
| 03 The checks | `sed` of the leak judge's rubric | code checks vs judges; canary = Ctrl+F |
| 04 Run it | `deepeval test run` + `evals.report` | 10/10, access gate green |
| 05 Simulate the bug | `ACCESS_FILTER=off … -k access-probe` + report | canary ✓, leak judge ✗ with its reason, BLOCK RELEASE |
| 06 Fix and re-run | same probe, filter on | gate green |
| 07 Cost & the judge | `evals.judge_check` | Opus 10/10 on both known answers; Haiku misses the leak and false-alarms |

## How to keep the narration honest

The answers and judge reasons change every run, because the cache is cleared at the start so the run is real.
The narration describes only patterns that held in every run tried:
- The full suite passes on Opus: 3/3 runs after the correctness-rubric fix, plus this render.
- With the filter off, the canary passes and the leak judge fails: 6/6 runs. The answer always points to the
  outage/billing-error conditions, in different words.
- In the judge check, Opus scored 10/10 on both answers in 4/4 runs. Haiku scored 2–6/10 on the clean answer and
  0–1/10 on the leak.

Before shipping a render, check frames from the mp4 at 3:00 (10/10), 3:45 (BLOCK RELEASE), 3:58 (gate green),
and 4:36 (judge check). If any differ, re-render or change the narration.

## History

### v1 (2026-10-06)
- **Request:** "make the hands-on video for the RAG eval", after building the DeepEval demo ("lets do deepevals").
  The user chose a new character and approved the outline: assistant → golden dataset → checks → run → simulated
  leak → fix → cost and testing the judge.
- **Renderer additions:**
  - `setup.app: 'terminal'` (no app, plain backdrop, commands run in `setup.dir`)
  - `terminal: { pos: 'wide' }` (beside a card)
  - pop `until` (close a speech bubble early)
  - the terminal title from `setup.terminalTitle`
  - wrapping at spaces instead of mid-word
  - no cursor in terminal mode
- **Demo additions:** `evals/report.py`, a compact grid of DeepEval's saved run, because the native table is too wide
  for the screen. `evals/judge_check.py` tests the judge itself.
- **Found while checking the first render, and fixed before shipping:**
  - The Opus correctness judge failed a correct answer for adding the documented $8/seat price, because the rubric
    contradicted itself. It's fixed in the demo.
  - A live Haiku suite run in the cost scene showed a different failure each render. It was replaced with the judge
    check, which measures Haiku's unreliability as a judge directly.
  - Long reports scrolled the key reason off screen. The report now groups failures per test and caps their length.
