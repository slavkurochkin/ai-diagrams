---
name: explainer-video
description: Make or update a narrated explainer video of an AgentFlow diagram template, with a camera tour, an illustrated character story, checklist cards, and a local voice. Use when asked to create a video about a template or architecture, revise an existing video (script, voice, character, pacing, framing), write its YouTube title, description, and chapters, or answer how the videos are made.
---

# Explainer videos

The pipeline lives in `tools/explainer-video/`. Read its `README.md` first: it covers setup, the scenario
format, and the commands. Existing videos live in `tools/explainer-video/videos/<id>/`:
- `video.mjs`: the scenario
- `transcript.md`: generated on every render
- `youtube.md`: generated on every render
- `LOG.md`: history, feedback, and decisions. **Read the log before changing an existing video.**

There are two kinds of video:
- **Diagram tours** use `render.mjs` and a template in the AgentFlow app.
- **Hands-on episodes** use `app.mjs` and the real MCP Inspector, the demo server in
  `~/Documents/dev/acme-crm-mcp`, and real terminal commands. See the README's "Hands-on episodes" section.

## Workflow

1. **Check prerequisites.**
   - The app is running (`npm run dev` → http://localhost:5173).
   - `tools/explainer-video/.cache/kokoro/` exists. If it doesn't, run `./setup.sh`.
2. **Review the template before scripting.** Read its YAML in `src/lib/templates.ts` and check the wiring,
   notes, and config. If the narration would have to explain around a flaw, raise it and fix the template first,
   with tests in `src/lib/templates.test.ts`.
3. **Write the scenario** in `videos/<id>/video.mjs`. Start by copying the closest existing video.
   - Title card → "Meet <character>" → one scene per step with a card → the answer returning to the
     character → the summary words.
   - Give the character a concrete request whose journey shows the template's key idea. For example, Leo's
     follow-up question exists to show the query rewriter.
   - Pick a new character look and name for each video unless the user asks for a returning character.
4. **Write the YouTube block.** Every video needs one: add `youtube: { title, description, tags }` to `video.mjs`.
   - **Title:** ≤ 100 characters, searchable, and says what the viewer learns
     (e.g. "How to Test an MCP Server: 5 Layers From Contract Tests to Production Evals").
   - **Description:** a hook (the problem, as a question), one sentence about the character's story, then
     "What you'll learn:" with 4–6 bullets.
   - **Don't** write chapters by hand. The renderer appends them from the real timeline, following YouTube's
     rules (first at 0:00, at least 3, each ≥ 10 s). If it warns about a short chapter, give neighboring scenes
     the same `chapter` name. Also give scenes a `chapter` name when two chips repeat (e.g. two "Back to Leo"
     scenes).
   - **Tags:** about 10, mixing the concept ("RAG") with broader terms ("AI architecture").
   - No calls to action to download or load the template; describe what the video explains.
   - Check the result with `node render.mjs <id> --meta`. It rewrites `transcript.md` and `youtube.md` in
     seconds, without rendering frames.
5. **Preview stills:** `node render.mjs <id> --stills scenes`. Look at every frame. Common fixes:
   - The camera is zoomed out because `focus` includes a far-away node. Drop that node; its edges still glow.
   - A pop-up or card overlaps nodes. Adjust `focus`/`cam`.
   - A pronunciation is wrong. Add a `speak` rule.
   Re-check specific moments with `--stills 81,130.5`, using times from `transcript.md`.
6. **Render in the background:** `node render.mjs <id>`. It takes about 2× the video length.
   Copy the result to `~/Desktop/` and `open` it.
7. **Make the thumbnail.** Every video needs one. Add a `thumbnail` block to `video.mjs`, then run
   `node thumbnail.mjs <id>` → `videos/<id>/thumbnail.jpg` (1280×720 JPEG, about 120 KB). It uses the rendered
   mp4, or preview stills from the renderer if there is none; `node thumbnail.mjs --all` redoes every video. The full option list is in the header of `thumbnail.mjs`.
   - **Layout (user-approved, 2026-10-06):** a dimmed frame from the video as the background, a yellow frame,
     the headline top right, the character large in the bottom-left corner, and a **hero card**. The hero card
     is a sharp, tilted crop of the one moment that matters, with a red circle and/or ✗/✓ stamp on the key
     detail, the series tag, and a yellow sticker (`badge`).
   - **Text:** 3–6 words, a question or a promise. It names the title's topic, but repeats at most one or two of
     its words: the two sit side by side on YouTube ("Trust the **AI judge?**" for "LLM-as-a-Judge Explained";
     not "Automate your MCP tests" for "Automating MCP Server Tests"). Use `**word**` for amber, and `\u00a0`
     to keep words together across the line break.
   - **Hero:** `frame` (seconds) plus `crop: [x, y, w, h]` in the 1920×1080 frame. Pick the concrete proof of the
     hook: the invented claim, the `"matches": 0`, the wall of 429s, Claude's "Should I go ahead?". Find
     coordinates by grabbing the frame with ffmpeg and reading it. `mark` is in crop pixels:
     `circle: [x, y, w, h]`, `cross: [x, y]`, or `check: [x, y]`. Keep crops tight so the text is readable.
   - **Background:** `bg` (seconds) picks a different moment for the background. Use it in diagram tours,
     where the character is drawn on the canvas, or she appears twice.
   - **Emotion:** strong and readable, and different on every video in a series. Combine:
     - `mood`: frustrated, neutral, curious, happy, surprised, angry, disappointed, or suspicious.
     - `pose`: hands-on-head (pulling hair), facepalm, thumbs-up, or thinking. There is no pointing pose: a lone
       finger read as a middle finger.
     - `fx`: anger, question, exclaim, sparkles, or tear.

     Match the hook: angry with anger for "Did the AI make it up?", shocked with hands-on-head and exclaim for
     "Will Claude delete it?", disappointed with facepalm for "Clicking doesn't scale".
   - **Check** every thumbnail at full size and as a small tile, and the series side by side. Text must be
     readable at 300 px wide, and nothing may sit in the bottom-right corner, where YouTube draws the duration.
     Copy the thumbnail to `~/Desktop/` alongside the video.
8. **Hand over and log.** Give the user the video and thumbnail paths, plus the YouTube title and description from `youtube.md`.
   Add a dated entry to `LOG.md` with the version, length, what changed, the user's feedback, and the reason.
   Commit `video.mjs`, `transcript.md`, `youtube.md`, `thumbnail.jpg`, and `LOG.md` together, but only when the user asks.

## Hands-on lessons

These are specific to `app.mjs`:
- **Probe before scripting.** Run the real flow once (Playwright, or the Inspector CLI) and look at what the
  app actually shows. Real behavior is often the best material: OAuth discovery after a 401, step-up after a
  403, and tool errors that say "OK".
- **Every still is checked against its caption.** If the output disagrees with the narration, fix the
  command or the narration; never ship the mismatch.
- **Give actions time.** A header swap plus reconnect takes about 7 s, so the narration must cover it, or the
  next scene's clicks run too early.
- **Failures leave a screenshot** in `out/<id>/failed-*.png`. Look at it before guessing.
- **Check the output resolution** with `ffprobe` after the first full render.

## User preferences (from feedback)

- The videos explain **how the diagram works**. Never encourage viewers to download or load the template.
- The user likes a human touch: a named character with a mood arc (frustrated → happy), speech bubbles,
  and the answer coming back to them.
- Voice: Kokoro `af_heart`. The user rejected macOS `say` voices.
- Unclear concepts get a checklist card rather than a longer caption. Earlier gaps included token origin
  ("the server doesn't create tokens") and what a monitor counts.
- **Show how, not just that.** Saying a step "is tested" or "is checked" isn't enough: show what decides
  the outcome, with a worked example. The user flagged the first testing video for saying tool calls get
  tested without explaining how the right call is determined. The fix showed the anatomy of a golden test case, the scoring
  checks, a counter-example (same request with different seeded data), and a failure with its fix. Apply this
  to every evaluator, gate, judge, or check a video covers.
- Before a full render, describe the story and the cards to the user, and confirm the direction if it's a
  new video.
