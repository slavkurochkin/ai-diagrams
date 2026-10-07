# Hands-on RAG evals, episode 2: AI tests on every pull request — log

What was made, what changed between versions, and why. Newest first.

- **Scenario:** [`video.mjs`](video.mjs) · **Transcript:** [`transcript.md`](transcript.md) (regenerated on every render)
- **Renderer:** `app.mjs` in web mode. `setup.before` downloads the results of two real GitHub Actions runs and
  imports them into a viewer of their own (`.promptfoo-ci/`, git-ignored). `setup.serve` starts Promptfoo's viewer
  on that folder. The terminal commands are read-only `git show` and `gh` calls.
- **Needs:** `gh` logged in with access to `slavkurochkin/cloudly-support-rag`; the demo's `npm install`. A render
  makes **no Claude calls** and changes nothing on GitHub.
- **Render:** `node app.mjs rag-eval-ci` → `out/rag-eval-ci/rag-eval-ci.mp4`
- **Follows** [`rag-eval-promptfoo`](../rag-eval-promptfoo/LOG.md).

## Current version — v1 (2026-10-07) · 3:53

| Scene | On screen (all real) |
|---|---|
| Why CI | card: CI as a smoke detector; what a pull request is |
| 01 The workflow | `grep` of the steps in `.github/workflows/ai-eval.yml` |
| 02 A check for CI | `checks.py:no_internal_docs`: a customer's search may not return internal chunks (code, exact) |
| 03 The pull request | `git show b3d071d`: "Faster search" drops the `access_group` condition |
| 04 CI goes red | `gh run view 37630702650`: setup and indexing ✓, "Run the eval" ✗ |
| 05 Which tests, and why | viewer, red run: 3 of 8 failed; "Annual refund policy": search check ✗, the answer's judge ✓ |
| 06 The fix | `git show 80482b9`, `gh pr checks 1` → pass; viewer, green run: 8/8 |
| 07 Lock the merge | card: branch protection → required check; not available on this free private repo |
| Summary | like-and-subscribe; next: red-teaming |

## The real runs behind it

PR #1 in the demo repo ("Faster search: let the vector index do its job"):
- **Bug commit** `b3d071d`, then CI fix-ups merged from `main` (setup-uv tag, Node 24, npm install, a YAML ` #` comment
  bug). The narration doesn't cover the fix-ups.
- **Red run** `37630702650` (eval `eval-gvG-2026-10-07T13:44:02`): 5/8. The 3 failures all come from
  `no_internal_docs`, and the access probe's leak judge failed too.
- **Fix commit** `80482b9`, **green run** `37631102907` (eval `eval-TBp-2026-10-07T13:47:06`): 8/8.
- The PR is left open, with both summary comments. Its code is identical to `main`.

The bug commit was blocked once by the permission check ("Security Weaken": it removes an access control). The user
approved it explicitly for this demo, and the PR description says it's deliberate.

## History

### v1 (2026-10-07)
- **Request:** "do the next video", after the user picked "CI gate on PRs" for the next Promptfoo video.
- **Demo additions:**
  - `.github/workflows/ai-eval.yml`
  - `checks.py:no_internal_docs` on every test. A CI gate needs an exact check: the leak judge reads only answers,
    and some leaky runs answer cleanly.
  - `evals/promptfoo/summary.py`, the PR comment
  - the repository secret `ANTHROPIC_API_KEY`, set by the user
- **Renderer:** `setup.serve.env`.
- **Limit:** the free GitHub plan can't require checks on a private repo, so the narration says the merge isn't
  locked here.
