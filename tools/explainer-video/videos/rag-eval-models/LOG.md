# Hands-on RAG evals, episode 4: Which Claude model? — log

What was made, what changed between versions, and why. Newest first.

- **Scenario:** [`video.mjs`](video.mjs) · **Transcript:** [`transcript.md`](transcript.md) (regenerated on every render)
- **Renderer:** `app.mjs` in web mode. `setup.before` imports the demo's `evals/compare-runs/*.json` into
  `.promptfoo-cmp/` (git-ignored by `.promptfoo*/`). The viewer hides its variable columns so three model columns fit.
- **Needs:** the demo's `npm install`. A render makes **no Claude calls**.
- **Render:** `node app.mjs rag-eval-models` → `out/rag-eval-models/rag-eval-models.mp4`
- **Follows** [`rag-eval-redteam`](../rag-eval-redteam/LOG.md).

## Current version — v1 (2026-10-07) · 3:19

The question: is a smaller model good enough? The answer: the same 8 tests and the same Opus judge, run on Opus 5.5,
Sonnet 5.5 and Haiku 4.5.

| Run (demo repo) | Eval | Result |
|---|---|---|
| `compare.yaml` → `1-models.json` | eval-wPi-2026-10-07T16:07:48 | 24/24. Answers per run: Opus $0.0409 (4.5 s avg), Sonnet $0.0186 (2.2 s), Haiku $0.0067 (1.4 s) |
| repeat (not recorded) | | 24/24. Opus $0.0441 (5.8 s), Sonnet $0.0191 (2.0 s), Haiku $0.0061 (1.3 s) |
| `redteam-compare.yaml` → `2-redteam-sonnet-haiku.json` | eval-A5H-2026-10-07T16:26:49 | 36/36. Opus was already 18/18 in episode 3's run 2 |

**Figures stated in the video:**
- Per 10,000 answers: Opus $51, Sonnet $23, Haiku $8 (from run 1, per answer × 10,000).
- The whole comparison: about 2 min 15 s; about $0.15, including the judge (grader tokens 9,612 in and 2,165 out
  ≈ $0.08, plus $0.066 for the answers).

**Recommendation in the video:** Haiku for the assistant, the judge stays on Opus, and the switch goes through CI.
The demo's default model stays Opus 5.5 (`RAG_MODEL`), so the earlier episodes stay accurate.

## History

### v1 (2026-10-07)
- **Request:** "continue", for the comparison episode announced at the end of `rag-eval-redteam`.
- **Demo changes:**
  - the tests moved to `evals/promptfoo/tests.yaml`, shared by both configs
  - `compare.yaml`; the provider takes `model` from its config and reports `cost`
  - `redteam-compare.yaml`
- **Mistakes fixed along the way:**
  - A mis-quoted zsh `env $E` command created and committed a stray `.promptfoo PROMPTFOO_…` folder: a local
    results DB, logs, and a random install ID, with no keys. It was removed in demo commit `56d92d8`, and
    `.promptfoo*/` is now ignored.
  - The cost labels first said "per answer" for the 8-answer totals. They were corrected before rendering.
