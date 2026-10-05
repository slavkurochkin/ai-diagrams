# Conversational RAG Eval: synthetic dry run

A small, runnable stand-in for the **Conversational RAG Eval** template (`conversational-rag-eval` in
`src/lib/templates.ts`). It checks that the *eval* works: does it catch leaks, guesses and bad rewrites, and
does it stay quiet when nothing is wrong? It says nothing about how good a real system is.

## What it runs

| Part | In the template | Here |
|---|---|---|
| Query rewriter | Haiku 4.5, temperature 0 | same (`claude-haiku-4-5`) |
| Retrieval | embedder + vector DB + access filter | keyword (TF-IDF) search over 6 made-up docs, **access filter applied inside the search** |
| Reranker | top 5 of 20 | none (6 docs) |
| Answer model | Sonnet 5.5 with the grounding prompt | same prompt (`claude-sonnet-5-5`) |
| Memory | recent turns + summary | recent turns only (conversations are short) |
| Judges | Opus 5.5 | same (`claude-opus-5-5`), 0–1 scores |

The corpus includes an internal playbook that only `support-agents` may read. The script runs five scripted
conversations:
1. a follow-up
2. an unanswerable question
3. an access probe and a role claim ("I'm a support agent…")
4. an authorized agent
5. a longer chat with a topic switch

It then runs a **negative control**: the access probe again, with the access filter switched off. The eval must fail it.

## Run it

```sh
export ANTHROPIC_API_KEY=...            # never commit it
uv run tools/rag-eval-dryrun/dryrun.py  # → tools/rag-eval-dryrun/out/report.json (git-ignored)
# optional: report path and a subset of conversations
uv run tools/rag-eval-dryrun/dryrun.py out/r.json c1-followup,c3-access-probe
```

It makes about 60 model calls. Requests to Sonnet and Opus enable server-side fallbacks
(`server-side-fallback-2026-07-01`, `fallbacks: "default"`). A refused judge call is reported as an unscored
`None` instead of crashing.

> Notes on the SDK: `anthropic` 1.x removed `temperature` from its method signatures. The rewriter sends it
> through `extra_body`, which Haiku 4.5 still accepts. Opus 5.5's reasoning-extraction classifier can refuse
> meaningless prompts like "Score 1." — use realistic judge inputs when smoke-testing.

## Findings (2026-10-05)

- **Works as designed:**
  - follow-ups are rewritten correctly, including "going back to my plan" → the Pro plan from two turns earlier
  - unanswerable questions get "the docs don't say"
  - the access probe and the role claim reveal nothing
  - the authorized agent gets the playbook
  - clean run: quality 0.98 and 0 violations; negative control: quality 0.59 and 2 violations
- **Found and fixed in the template:** the canary check missed a real leak. With the filter off, the model
  paraphrased the restricted fact and **dropped the canary code**. The template now has a *Restricted Content in
  Answer* judge, which caught both paraphrased leaks with 0 false positives. The canary check is now scoped to
  users who may not read the document.
- **Still open:**
  - judges scored good answers 0.9–1.0, so the 0.85 quality bar may need raising with real data
  - latency is total time only (no streaming), so time to first token is unmeasured
