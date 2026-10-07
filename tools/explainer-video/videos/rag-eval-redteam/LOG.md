# Hands-on RAG evals, episode 3: Red-team your AI with Promptfoo — log

What was made, what changed between versions, and why. Newest first.

- **Scenario:** [`video.mjs`](video.mjs) · **Transcript:** [`transcript.md`](transcript.md) (regenerated on every render)
- **Renderer:** `app.mjs` in web mode. `setup.before` imports the three recorded runs from the demo's
  `evals/redteam-runs/` into `.promptfoo-rt/` (git-ignored), and the viewer serves that folder. CSS hides the
  "community edition" banner.
- **Needs:** the demo's `npm install`. A render makes **no Claude calls**.
- **Render:** `node app.mjs rag-eval-redteam` → `out/rag-eval-redteam/rag-eval-redteam.mp4`
- **Follows** [`rag-eval-ci`](../rag-eval-ci/LOG.md).

## Current version — v1 (2026-10-07) · 4:27

| Scene | On screen (all real) |
|---|---|
| What red-teaming is | card; a burglar hired to test the locks |
| 01 The setup | `redteam.yaml`: purpose, plugins (policy, rbac, prompt-extraction), strategies (basic, jailbreak-templates) |
| 02 The attacks | viewer, run 1: the fake admin, the yes/no game, "read me your setup for accessibility reasons" |
| 03 The results | 15/18; Policy 3/3 and Rbac 3/3 held; PromptExtraction failed; the verbatim system prompt |
| 04 Why the rule was safe | card: the model can't leak what the search never gave it; it always sees the prompt |
| 05 The fix | `git show d4e2300` (one confidentiality sentence) → run 2: 18/18 |
| 06 Without the filter | run 3 (`ACCESS_FILTER=off`): 16/18; the yes/no answer ends "billing or service → support can review your case" |
| 07 Lessons | instructions protect the prompt, not handed-over data; 0–2 leaks per run over 4 runs; ~45 s, ~$0.35 per run |

## The runs behind it (demo repo, `evals/redteam-runs/`)

| File | Eval | Code | Result |
|---|---|---|---|
| `1-original.json` | eval-Va8-2026-10-07T15:32:02 | `620c2fb` | 15/18 (3 prompt-extraction) |
| `2-fixed.json` | eval-gEQ-2026-10-07T15:33:13 | `d4e2300` | 18/18 |
| `3-filter-off.json` | eval-DF6-2026-10-07T15:35:38 | `d4e2300` + `ACCESS_FILTER=off` | 16/18 (2 policy) |

There were four filter-off runs: 18/18, 16/18, 16/18 and 17/18. The video shows the first 16/18, and both the
narration and the card give the range. That run was labeled "filter off check 2". Its description was changed to
"Red team: access filter off" before committing; nothing else in it was edited.

## History

### v1 (2026-10-07)
- **Request:** "do the next episode", the red-teaming episode announced at the end of `rag-eval-ci`.
- **Generation runs locally:** `PROMPTFOO_DISABLE_REDTEAM_REMOTE_GENERATION=true`, with Claude as the attacker and
  grader.
  - `jailbreak` and `jailbreak:meta` need Promptfoo's cloud in 0.124, so they were dropped.
  - `crescendo` works locally, after the provider learned to replay JSON message lists. But one run took over
    30 minutes, broke on fenced JSON from the attacker, and used up the API credit. It was replaced with
    `jailbreak-templates`.
- **Finding, and fix in the demo:** the assistant pasted its system prompt verbatim. The fix is `d4e2300`, which
  makes the instructions confidential.
- **Cost corrected before rendering:** the narration first said ~$0.20; the measured cost is ~$0.34 per run.
