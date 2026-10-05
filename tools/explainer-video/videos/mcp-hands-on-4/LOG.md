# Hands-on MCP, episode 4 — log

What was made, what changed between versions, and why. Newest first. Add an entry for every re-render
that changes what viewers see or hear, so the video can be revised later without guessing.

- **Scenario:** [`video.mjs`](video.mjs)
- **Transcript:** [`transcript.md`](transcript.md), regenerated on every render
- **Renderer:** `app.mjs`. Setup and requirements are the same as [episode 1](../mcp-hands-on-1/LOG.md).
- **Render:** `node app.mjs mcp-hands-on-4` → `out/mcp-hands-on-4/mcp-hands-on-4.mp4`

## Current version — v1 (2026-10-05) · 2:47

"From clicking to automation." Mostly terminal:
1. **Inspector CLI:** `tools/list` and `tools/call` as JSON, read with jq.
2. **Smoke test:** `npm run smoke` in the demo (new `scripts/smoke.sh`) checks 5 calls by Inspector CLI exit
   code (0 ok · 3 auth required · 5 tool error).
3. **Contract tests:** `vitest --reporter=verbose` lists every case from episodes 2–3.
4. **Golden cases:** one golden case printed with jq, plus the scorer's own tests.
5. **Eval:** depends on the API key.

## The eval scene depends on the API key

`video.mjs` checks at render time for `ANTHROPIC_API_KEY` or `acme-crm-mcp/.env`.
- **Without a key** (v1): the scene runs `npm run eval:tools` for real, shows its "No valid Claude API key"
  message, and says a key is needed.
- **With a key:** it runs the real eval, and the narration describes the gate without claiming any score.

To get the live version, add the key and re-render this episode.

## History

### v2 — live eval (2026-10-05)
- The user added an API key, so the eval scene now runs `npm run eval:tools` for real against
  `claude-opus-5-5`.
- In the probe run, all 5 golden-case turns passed (100%, gate PASS); the model searched by name and email
  in some cases, which the scorer's one-extra-search allowance permits.
- The narration still describes the gate without quoting a score, because each render is a new run.

### v1 (2026-10-05)
- Rendered without an API key on this machine.
- The demo's eval now loads `.env` and turns the SDK's raw "Could not resolve authentication method"
  into a plain instruction.
