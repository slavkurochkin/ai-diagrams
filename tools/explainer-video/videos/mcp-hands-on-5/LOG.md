# Hands-on MCP, episode 5: A real AI client — log

What was made, what changed between versions, and why. Newest first. Add an entry for every re-render
that changes what viewers see or hear, so the video can be revised later without guessing.

- **Scenario:** [`video.mjs`](video.mjs)
- **Transcript:** [`transcript.md`](transcript.md), regenerated on every render
- **Renderer:** `app.mjs`. Setup is the same as [episode 1](../mcp-hands-on-1/LOG.md), plus `ANTHROPIC_API_KEY` in
  the demo project's `.env` (git-ignored). Every render makes real Claude calls (a few cents).
- **Render:** `node app.mjs mcp-hands-on-5` → `out/mcp-hands-on-5/mcp-hands-on-5.mp4`

## Current version — v1 (2026-10-05) · ~2:12

Full circle to the very first video. Becky's original request, "add Dana Kim if she's not in the CRM",
runs for real: Claude (`claude-opus-5-5`) connected over MCP to the demo server via the demo's new
`npm run agent`.
1. **Add:** it searches before creating, finds no Acme Dana (Globex's Dana is invisible to Acme's token),
   then creates her once.
2. **Same request again:** it searches, finds her, and doesn't duplicate.
3. **Delete:** it searches, asks for confirmation, and deletes by exact id only after "Yes".
4. **Audit log:** the AI's create and delete are recorded under `acme-agent`, and Globex's `c_201` is untouched.

## How to keep the narration honest

The model's wording, and sometimes its exact calls, vary run to run: in the probes it sometimes searched by
both name and email. The narration therefore describes the *pattern* (search first, create once, ask before
deleting) and never quotes the model. Before shipping a render, check its frames: if the model ever does
something else (e.g. deletes without asking), re-render, or change the narration to say what happened.

## History

### v1 (2026-10-05)
- **Request:** "let's do episode 5" (the user added an API key).
- **Demo project additions:**
  - `src/aiClient.ts`: a shared MCP + Claude tool loop, now also used by the eval.
  - `npm run agent -- "<message>" [--then "<reply>"]…`: a terminal conversation that prints every tool call.
- **Verified in stills and in the final render:** every scene's output matched the narration.
