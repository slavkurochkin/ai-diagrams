# Hands-on MCP, episode 2 — log

What was made, what changed between versions, and why. Newest first. Add an entry for every re-render
that changes what viewers see or hear, so the video can be revised later without guessing.

- **Scenario:** [`video.mjs`](video.mjs)
- **Transcript:** [`transcript.md`](transcript.md), regenerated on every render
- **Renderer:** `app.mjs`. Setup and requirements are the same as [episode 1](../mcp-hands-on-1/LOG.md).
- **Render:** `node app.mjs mcp-hands-on-2` → `out/mcp-hands-on-2/mcp-hands-on-2.mp4`

## Current version — v1 (2026-10-05) · 3:54

"Tokens and tenants, live." Becky:
1. picks up the Dana Kim puzzle
2. gets a Globex token, swaps the Inspector's header, reconnects, and Dana appears
3. proves the isolation lives in Postgres row-level security: the owner sees both tenants,
   `app_user` sees 0 rows with no tenant set, and only Acme's rows with the tenant set
4. tries a read-only token on `create_contact`: the Inspector shows "Tool Call Failed" with an auth-server
   error, because MCP clients answer **403 `insufficient_scope`** with *step-up authorization* and this demo
   has no sign-in page; the Network log shows the 403
5. sends the same call with curl: 403 with `WWW-Authenticate: insufficient_scope, scope="crm:write"`
6. reads the audit log: 2 denied rows, one from the Inspector and one from curl
7. sends test-only expired and wrong-audience tokens: both get 401 `invalid_token`, with the exact reason

## History

### v1 (2026-10-05)
- Demo project additions made for this episode: `npm run token -- <client> --expired | --audience <url>`
  (test-only, minted locally and labeled as such).
- Real behavior worth knowing: on a 403 the Inspector attempts step-up authorization. It is narrated as is,
  rather than hidden.
- Renderer fixes this episode needed:
  - Target only *visible* matches (closed dialogs leave hidden copies of the same text).
  - Proportional real pauses between actions when fast-forwarding stills.
  - A screenshot is saved for every failed action (`out/<id>/failed-<t>s.png`).
  - `setup.tokens` mints tokens before the Inspector starts, so the catalog can carry the header.
- Script timing lesson: a header swap plus reconnect takes about 7 s of actions. Scenes must have narration
  at least that long, or the next scene's clicks run before the reconnect. Both swap scenes got a line
  explaining *why* you reconnect (headers apply on the next connection).
- The first full render was 1280×720 because of a capture bug (see episode 1's log); it was re-rendered at 1080p.
