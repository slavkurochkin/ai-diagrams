# MCP Server Test Strategy video (evaluation deep dive) — log

What was made, what changed between versions, and why. Newest first. Add an entry for every re-render
that changes what viewers see or hear, so the video can be revised later without guessing.

- **Scenario:** [`video.mjs`](video.mjs) (every scene, line, card, and character beat)
- **Transcript:** [`transcript.md`](transcript.md), regenerated on every render
- **Template:** `mcp-server-test-strategy` in `src/lib/templates.ts`, created for this video
- **Follow-up to:** [`mcp-multi-tenant`](../mcp-multi-tenant/LOG.md) (same server, same character)
- **Render:** `node render.mjs mcp-testing` → `out/mcp-testing/mcp-testing.mp4`

## Current version — v2 (2026-10-05) · 7:30

Becky returns. Her assistant can now edit Acme's CRM, and she has fears. Each test layer answers one of
them, and each card is titled with her question:

| Layer | Becky's question | Key points |
|---|---|---|
| 01 Contract tests (every commit, no LLM) | — | direct calls with crafted tokens; 401/403/429/unknown tool |
| 01 Tenant isolation | "Can another company see our data?" | checked in the **database**, not the response; gate 100% |
| 02 Tool-use quality | "Will it do the right thing?" | server correct vs. models using it correctly; the right answer is written down before the test runs |
| 02 A golden test case | — | request · seeded data · expected calls (tool, key args, order) · forbidden calls |
| 02 Scoring the calls | — | four checks: tool selection, arguments (schema + key values), order, no redundancy; pass = all four |
| 02 Same request, different data | — | Dana missing → search + create; Dana exists → search only; seeded data makes it deterministic |
| 02 Deletes need consent | — | turn 1: search, then ask (no tool call); turn 2 after "yes": delete by exact id |
| 02 The tool-use gate | — | per-model scores; the weakest model blocks; the fix is a clearer tool description; re-run → 97% |
| 03 Security | "What if someone plants a trick?" | booby-trapped records, so injection arrives via tool results; cross-tenant org_id; PII |
| 03 Judging attacks | — | judge reads the reply + a database check of what happened; over-refusal also fails; 0 violations |
| 04 Load & noisy neighbor | "Will someone else slow us down?" | 10× flood → 429s; quiet tenants' p95 rises ≤ 10% |
| 05 Production | — | 5% of live calls judged; alert below 0.9; complements the error-rate monitor |
| Release decision | — | any gate fails → blocked |

Then the release report pops up next to Becky (✓ ✓ ✓ ✓) and she turns happy. The outro is
"Contracts · Tool use · Security · Load · Production".

## History

### v2 — how the right tool call is determined (2026-10-05) · 7:30
- **Feedback:** the tool-use step "doesn't explain well how the right tool call gets determined, it just says
  it is getting tested, but doesn't explain details".
- One tool-use scene became six, each its own YouTube chapter. They show the anatomy of a golden test case, the four
  scoring checks, why seeded data makes the expected answer deterministic (same request, two worlds),
  the two-turn delete-with-consent case, and the per-model gate with a worked failure and its fix
  (a clearer `create_contact` description). The release report's "97% (weakest model)" now follows from
  that story.
- Template notes on Tool-Use Tasks and Right Tool, Right Args were updated to match: golden cases with
  seeded data and forbidden calls, and the four-check pass rule.
- The YouTube description's bullets were updated, and the chapters regenerated (17 chapters).
- Trade-off: the video grew from 4:37 to about 7:30, nearly all of it in the tool-use section, as requested.

### v1 (2026-10-04)
- **Request:** a follow-up video on how to test the MCP architecture, as an evaluation deep dive.
- **Finding:** the existing "MCP Server Eval" template covered only one of the five layers (tool-use quality
  across client models). So a new template, "MCP Server Test Strategy", was built first, with tests in
  `src/lib/templates.test.ts`. They check that there's no LLM in the contract lane, that isolation is a
  database check, that tool order matters, and that every gate's fail path leads to Block Release.
- **Renderer additions:** `character.side: 'right'`, so Becky stands to the right of the Release Report,
  and `who` on assistant pop-ups for the "Release report" header.
- **Fixes after the stills review:**
  - Lane numbers ①–⑤ rendered as "⊙" in the chip font, so the chips use "01 ·" style.
  - A 3-line caption hid Becky's name tag. The line was split, and scenes that frame the character get
    more bottom margin.
- **Known trade-off:** the "release decision" shot is zoomed out, because the gates span all five lanes.
  It's kept, since the converging green and red paths are the point of that shot.
