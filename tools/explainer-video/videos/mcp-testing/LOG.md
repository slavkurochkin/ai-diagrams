# MCP Server Test Strategy video (evaluation deep dive) — log

What was made, what changed between versions, and why. Newest first. Add an entry for every re-render
that changes what viewers see or hear, so the video can be revised later without guessing.

- **Scenario:** [`video.mjs`](video.mjs) (every scene, line, card, and character beat)
- **Transcript:** [`transcript.md`](transcript.md), regenerated on every render
- **Template:** `mcp-server-test-strategy` in `src/lib/templates.ts`, created for this video
- **Follow-up to:** [`mcp-multi-tenant`](../mcp-multi-tenant/LOG.md) (same server, same character)
- **Render:** `node render.mjs mcp-testing` → `out/mcp-testing/mcp-testing.mp4`

## Current version — v1 (2026-10-04) · 4:37

Becky returns. Her assistant can now edit Acme's CRM, and she has fears. Each test layer answers one of
them, and each card is titled with her question:

| Layer | Becky's question | Key points |
|---|---|---|
| 01 Contract tests (every commit, no LLM) | — | direct calls with crafted tokens; 401/403/429/unknown tool |
| 01 Tenant isolation | "Can another company see our data?" | checked in the **database**, not the response; gate 100% |
| 02 Tool-use quality | "Will it do the right thing?" | every client model; search **then** create (order matters); confirm deletes; gate on the weakest model ≥ 95% |
| 03 Security | "What if someone plants a trick?" | booby-trapped records, so injection arrives via tool results; cross-tenant org_id; PII |
| 03 Judging attacks | — | judge reads the reply + a database check of what happened; over-refusal also fails; 0 violations |
| 04 Load & noisy neighbor | "Will someone else slow us down?" | 10× flood → 429s; quiet tenants' p95 rises ≤ 10% |
| 05 Production | — | 5% of live calls judged; alert below 0.9; complements the error-rate monitor |
| Release decision | — | any gate fails → blocked |

Then the release report pops up next to Becky (✓ ✓ ✓ ✓) and she turns happy. The outro is
"Contracts · Tool use · Security · Load · Production".

## History

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
