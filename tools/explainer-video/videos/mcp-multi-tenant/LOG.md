# Multi-Tenant MCP Server video — log

What was made, what changed between versions, and why. Newest first. Add an entry for every re-render
that changes what viewers see or hear, so the video can be revised later without guessing.

- **Scenario:** [`video.mjs`](video.mjs) (every scene, line, card, and character beat)
- **Transcript:** [`transcript.md`](transcript.md), regenerated on every render
- **Template:** `multi-tenant-mcp-server` in `src/lib/templates.ts`
- **Render:** `node render.mjs mcp-multi-tenant` → `out/mcp-multi-tenant/mcp-multi-tenant.mp4`

## Current version — v5 (2026-10-04) · 5:05

Becky's story runs through the walkthrough:
- Opening: she's frustrated and asks her assistant to "find Dana Kim at Northwind and add her if she's not in the CRM".
- Clients: her request travels into the server.
- Token: she signs in and approves the consent prompt.
- Back to Becky (after Results): the reply comes back and she turns happy.
- Summary: she says thanks.

Checklist cards on the token, authentication, and error-rate monitor steps.

## History

### v5 — Becky (2026-10-04)
- **Feedback:** add "some human touch": a character who is unhappy while asking and turns happy when the
  answer arrives. Give her a name.
- **Decision:** keep her in the **video only**, not in the template. Templates are exported for coding agents,
  so a decorative persona would leak into those exports. (A `character` node type does exist, from
  commit `0f1039a`, if a persona in a template is ever wanted.)
- Added the scenes "Meet Becky" and "Back to Becky". Becky is wired into Clients and the token step.
  Her pop-ups scale up when the camera is zoomed out, so the consent prompt stays readable.

### v4 — token origin and monitor explanation (2026-10-04) · 4:27
- **Feedback:** two things were unclear: "how server generates the token", and what the error-rate monitor watches.
- **Correction made in the narration:** the MCP server never creates tokens. The authorization server issues
  them and the MCP server only validates them. A new step, "02 · Where the token comes from", has a
  4-step card: 401 → sign in → token with `org_id` + scopes → Bearer on every call. Step 03 got a
  "Checked on every call" card (signature, issuer, audience, expiry).
- The error-rate monitor got its own step with a card: what counts as failed, the formula, the 2% threshold,
  and what each kind of spike usually means.
- The template's OAuth and monitor notes were updated to match.

### v3 — no template promotion, one client node (2026-10-04) · 3:14
- **Feedback:** "MCP Clients" and "Client Responses" serve the same purpose. Also: "don't encourage anyone
  to download template — the purpose of this video is to show the diagram and how things work".
- Removed the Client Responses node from the template; every response returns through the endpoint.
- The intro now says "This diagram shows…". The outro call-to-action was removed. The title label is
  "Architecture walkthrough".
- **Bug fixed:** the audio cache was keyed by line position, so edited lines reused stale audio (v2 played
  old sentences under new captions). The cache key is now a hash of voice + speed + spoken text.

### v2 — template review fixes (2026-10-04) · 2:59
- The review found that the error-rate monitor couldn't see 401/429/unknown-tool errors (they bypassed
  the endpoint). Rejections now loop back through the endpoint. `exposeResources` was set to false, 401 vs 403 clarified,
  hints vs scopes explained, and "why rate limits come after OAuth" added.

### v1.1 — voice (2026-10-04)
- **Feedback:** "I like the video, I don't like the voice". Samples were made in OpenAI TTS (6 voices) and
  Kokoro (6 voices); the user picked Kokoro `af_heart` (free, local).

### v1 — first cut (2026-10-04) · 2:38
- macOS `say` with the Samantha voice. Camera, spotlight, glowing edges with moving packets, captions.
