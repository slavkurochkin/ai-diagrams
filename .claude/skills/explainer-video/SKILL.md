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
7. **Hand over and log.** Give the user the video path, plus the YouTube title and description from `youtube.md`.
   Add a dated entry to `LOG.md` with the version, length, what changed, the user's feedback, and the reason.
   Commit `video.mjs`, `transcript.md`, `youtube.md`, and `LOG.md` together, but only when the user asks.

## User preferences (from feedback)

- The videos explain **how the diagram works**. Never encourage viewers to download or load the template.
- The user likes a human touch: a named character with a mood arc (frustrated → happy), speech bubbles,
  and the answer coming back to them.
- Voice: Kokoro `af_heart`. The user rejected macOS `say` voices.
- Unclear concepts get a checklist card rather than a longer caption. Earlier gaps included token origin
  ("the server doesn't create tokens") and what a monitor counts.
- Before a full render, describe the story and the cards to the user, and confirm the direction if it's a
  new video.
