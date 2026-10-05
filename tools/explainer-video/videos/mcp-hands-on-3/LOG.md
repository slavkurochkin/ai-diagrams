# Hands-on MCP, episode 3 — log

What was made, what changed between versions, and why. Newest first. Add an entry for every re-render
that changes what viewers see or hear, so the video can be revised later without guessing.

- **Scenario:** [`video.mjs`](video.mjs)
- **Transcript:** [`transcript.md`](transcript.md), regenerated on every render
- **Renderer:** `app.mjs`. Setup and requirements are the same as [episode 1](../mcp-hands-on-1/LOG.md).
- **Render:** `node app.mjs mcp-hands-on-3` → `out/mcp-hands-on-3/mcp-hands-on-3.mp4`

## Current version — v1 (2026-10-05) · 3:21

"Breaking it on purpose."
1. **A flood:** 26 calls, the first ones 200 then 429; the last response's headers show
   `429 Too Many Requests` + `Retry-After: 1`.
2. **The neighbor:** Acme floods again, then gets 429 ×3 while Globex gets 200.
3. **Bad arguments:** an invalid email is rejected by server-side validation as a *tool error*, and the
   Protocol log says OK.
4. **An unknown tool:** the Inspector CLI says "not found on server" (exit 5); curl shows the server's tool error.
5. **A cross-tenant delete:** Acme deletes Globex's `c_201` by exact id and gets "No contact with id c_201",
   the same as a missing id. psql shows Dana untouched, and the attempt is in the audit log.
6. **`/metrics`:** 429s and tool errors per tenant.

## History

### v1 (2026-10-05)
- **Bug found in the demo while writing this episode:** validation errors and unknown tools weren't counted
  as tool errors in `/metrics`, because the body arrives as bytes and wasn't sniffed. Fixed in the demo
  project, with a contract test.
- **Narration had to follow the data, checked in stills:**
  - The bucket refills at 2 calls a second, so a separate Retry-After call or neighbor check a few seconds
    later saw 200. Both checks now run in the same command as the flood (`-D` keeps the last 429's headers).
  - The flood lets through fewer than 20 calls, because earlier calls in the episode used part of the
    burst, so the narration says "the first ones go through".
  - The metrics narration attributes the made-up tool's error to Globex, whose token made that call.
