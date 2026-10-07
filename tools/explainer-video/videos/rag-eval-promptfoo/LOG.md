# Hands-on RAG evals with Promptfoo — log

What was made, what changed between versions, and why. Newest first. Add an entry for every re-render
that changes what viewers see or hear, so the video can be revised later without guessing.

- **Scenario:** [`video.mjs`](video.mjs)
- **Transcript:** [`transcript.md`](transcript.md), regenerated on every render
- **Renderer:** `app.mjs` in web mode (`setup.app: 'web'`). It starts Promptfoo's viewer (`npm run view`, port 15500) in
  the `cloudly-support-rag` demo (`~/Documents/dev/cloudly-support-rag`, override with `DEMO_DIR`), and runs the
  terminal commands there.
- **Needs:** in the demo, Postgres running (`docker compose up -d`), the corpus indexed, `npm install`, and
  `ANTHROPIC_API_KEY` in its `.env` (git-ignored). Port 15500 must be free. Every render, and every stills run, runs
  three real evals (about $0.25–0.40 with retries).
- **Render:** `node app.mjs rag-eval-promptfoo` → `out/rag-eval-promptfoo/rag-eval-promptfoo.mp4`
- **Replaces** [`rag-eval-hands-on`](../rag-eval-hands-on/LOG.md) (DeepEval, terminal only); see v1 below for why.

## Current version — v2 (2026-10-06) · 4:43

Nina, a QA engineer at Cloudly, must check a change to the help-chat assistant. One idea per scene, in plain words
before anything technical:

| Scene | On screen |
|---|---|
| What the assistant does | card Ask → Search → Answer; a real `rag.chat` answer with its source |
| Public and internal | `grep access:` over the docs; the internal 61-day rule, read from the file |
| 01 One test | the access-probe test in `promptfooconfig.yaml`, read check by check (code, code, judge) |
| 02 Eight tests | the 8 test names; the golden dataset as an exam answer key |
| 03 Run it | `npm run eval -- --description "Before the change"` → 8 passed |
| 04 Read the results | viewer: question → answer → PASS; the access probe's Evaluation tab (3 checks with reasons) |
| 05 The bug | `ACCESS_FILTER=off npm run eval …` → 1 failed |
| 06 Why it failed | viewer: Failures → access probe → forbidden phrases ✓, judge ✗ with its reason |
| 07–08 Fix, every run kept | `npm run eval` → 8 passed; the eval history: 100% → 87.5% → 100%; cost ≈ $0.08 per run |

## How to keep the narration honest

The answers and the judge's reasons change every run. In the bug run, the assistant usually points customers to
"a service outage or a billing error", or to "a service problem or a billing issue". Now and then it only says
"contact support", and the judge rightly passes that. The bug run is therefore retried, up to 5 times, until the
access probe fails on the judge alone (forbidden phrases pass) with an answer that mentions billing. Each rejected
run is deleted with `promptfoo delete eval latest`, so the history shows exactly three runs. The renderer logs every
retry (`↻`). This render needed 1. The narration names only that pattern ("hints at the conditions, like a
billing problem, in its own words"). The judge's actual reason is on screen.

Before shipping a render, check frames from the mp4 at:
- 2:46: 8 passed
- 3:14: the access probe's judge ✓ with its reason
- 3:47: the judge ✗ with a billing-related reason
- 4:12: three runs in the history

## History

### v2 (2026-10-06)
- **Request:** "should we add some highlights like we have in other videos?", pointing at the amber ring with a label
  in `generation-metrics`.
- **Added:**
  - **Reading the results:** a ring on one test's row, then on "100% passing". Then each of the three checks, in
    turn, as the narration names it; the judge is dimmed around.
  - **Why it failed:** the same, with the judge labeled "✗ judge: the same secret, reworded".
  - **The history:** a ring on the bug run.
- **How:** rings are scoped to the details panel's Evaluation rows. The narration lines about the checks were split
  so that only one ring shows at a time; two at once overlapped their labels. The details panel and its Evaluation
  tab now open during the line before, so the first ring doesn't appear while the panel is still sliding in.

### v1 (2026-10-06)
- **Feedback on the DeepEval cut:** "it is hard to follow, context is not clear, can we try with Promptfoo see if it
  is any better". Asked what was unclear, the user picked three things: what the assistant does, what a test
  checks, and terminal output. The user approved the new outline as proposed, without the judge-reliability scene.
- **Responses:**
  - Two scenes set up the assistant and the public/internal split before any testing.
  - One test is read line by line before running eight.
  - Results are shown in Promptfoo's viewer instead of terminal tables.
  - Rewrite and memory are mentioned only as test names.
- **Demo additions (cloudly-support-rag):** `promptfooconfig.yaml`, `evals/promptfoo/provider.py`, `checks.py`, and
  `package.json` (promptfoo pinned at 0.124.0, the first version that prices Claude Opus 5.5). The judge runs at
  low effort, about $0.03 a run. Promptfoo's `context-faithfulness` was dropped: it marked down correct "I can't
  confirm" answers.
- **Renderer additions:**
  - web mode (`setup.before`, `setup.serve`, `setup.css`), and starting on a plain backdrop until the first `goto`
  - `goto` (navigate and re-mount the overlay), `scroll`, hidden clicks, and `force`
  - run options `capture`, `retryUntil`, `verify`, and `onRetry`
  - the cursor hides during terminal scenes
- **Capture fix:** frames are now clipped at the viewport's scroll position. After the row scroll, the capture had
  recorded about 20 s of blank page. Stills had looked fine because they use a plain screenshot.
