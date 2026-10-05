# Hands-on MCP, episode 1: Meet the MCP Inspector — log

What was made, what changed between versions, and why. Newest first. Add an entry for every re-render
that changes what viewers see or hear, so the video can be revised later without guessing.

- **Scenario:** [`video.mjs`](video.mjs)
- **Transcript:** [`transcript.md`](transcript.md), regenerated on every render
- **Renderer:** `app.mjs` (real app, real terminal). Not `render.mjs`, which is for the diagram videos.
- **Needs:** the demo server project at `~/Documents/dev/acme-crm-mcp` (override with `ACME_DIR`), Docker
  running its Postgres, and nothing else on ports 8787/8788/6274. The renderer starts the demo server and
  the Inspector itself, fresh, every run.
- **Inspector:** `@modelcontextprotocol/inspector` 2.9.0, pinned in `package.json`. Its UI selectors
  (labels, placeholders, Mantine classes) are used in the scenario, so re-check stills after upgrading.
- **Render:** `node app.mjs mcp-hands-on-1` → `out/mcp-hands-on-1/mcp-hands-on-1.mp4`

## Current version — v1 (2026-10-05) · 3:52

The first episode of the hands-on series, a follow-up to the three diagram videos. Becky, now exploring
the server herself:
1. sees both servers start
2. adds the server in the Inspector
3. gets **401**, and watches the Inspector's Network log discover the authorization server via the
   protected-resource metadata
4. gets a token in the terminal and decodes its claims
5. adds the `Authorization: Bearer` header in Custom Headers
6. connects, and the Protocol log shows the `initialize` / `initialized` / `tools/list` handshake (and the
   stateless server's 405 for the GET notification stream)
7. reads the tool hints (read-only, destructive)
8. calls `search_contacts`: Priya is found, but Dana returns 0 matches, the cliffhanger for episode 2

## History

### v1.1 — 1080p (2026-10-05)
- The first renders came out **1280×720**, although stills were 1920×1080: the raw CDP frame capture
  ignores the page's device scale factor. `lib/capture.mjs` now requests the scaled size explicitly
  (`ctx.captureScale`, 1.5 for `app.mjs`). All hands-on episodes were re-rendered at 1920×1080.

### v1 (2026-10-05)
- **Request:** a continuing hands-on series using the demo server and the MCP Inspector, with no diagrams,
  the same character, and episodes 1–4. Becky tries it herself. Don't point viewers to the demo repo.
- **New renderer:** `app.mjs` + `lib/overlay.js`. It drives the real Inspector with Playwright at scheduled
  moments: a fake cursor, live typing, highlight rings, and a terminal panel whose commands run for real at
  render time. The layout is 1280×720 captured at 1.5× for readable UI text. Narration, timeline,
  transcript, and YouTube are shared with `render.mjs` via `lib/prepare.mjs`, and capture via
  `lib/capture.mjs`.
- **Real findings that shaped the script:**
  - On 401 the Inspector really does the OAuth discovery dance; the Network log shows it, so it's narrated.
  - The Inspector's "Failed to connect" toast exposed that the demo authorization server's metadata
    lacked `response_types_supported`, which RFC 8414 requires. That was fixed in the demo project. The
    remaining complaint (no `authorization_endpoint`) is genuine, and narrated: this demo issues tokens
    only to registered clients, with no browser sign-in.
  - Running the demo project's tests left test data in the demo database (Acme briefly "had" Dana Kim).
    Fixed in the demo project: tests restore the seed on exit.
- **Renderer fixes found via stills:**
  - Lookups wait on missing elements, so they were made non-blocking.
  - Typing is flushed before the next action when fast-forwarding.
  - Stills wait 2.5 s for the live app to settle.
  - The character's bubble opens to the right in picture-in-picture.
  - `quiet` terminal commands, plus `cardFrom` / `cardTop` / `bottomleft` card placement.
- **Fix from the first full render:** the Inspector's error toast closes itself after a few seconds, so a
  scripted dismiss-click near the end of the scene failed. The toast is now highlighted ("the error: no
  sign-in endpoint") during the first two lines, while it's actually on screen.
