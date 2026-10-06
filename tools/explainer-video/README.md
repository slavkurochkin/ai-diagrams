# Explainer videos

Narrated walkthrough videos of AgentFlow diagram templates. The pipeline drives the real app:
- it loads a template
- it moves a camera across the canvas, spotlighting nodes and sending glowing packets along edges
- an illustrated character carries a short story through the flow
- checklist cards explain each step
- a local voice narrates

The output is a 1080p MP4.

| Video | Template | Character |
|---|---|---|
| [`mcp-multi-tenant`](videos/mcp-multi-tenant/LOG.md) | Multi-Tenant MCP Server | Becky, sales rep at Acme |
| [`conversational-rag`](videos/conversational-rag/LOG.md) | Conversational RAG | Leo, Cloudly customer |
| [`mcp-testing`](videos/mcp-testing/LOG.md) | MCP Server Test Strategy | Becky returns (follow-up to `mcp-multi-tenant`) |
| [`conversational-rag-eval`](videos/conversational-rag-eval/LOG.md) | Conversational RAG Eval | Priya, AI engineer at Cloudly (follow-up to `conversational-rag`) |
| [`retrieval-metrics`](videos/retrieval-metrics/LOG.md) | RAG Eval Visualizer, live (`app.mjs`, AgentFlow mode) | Priya returns (metrics series 1) |
| [`mcp-hands-on-1`](videos/mcp-hands-on-1/LOG.md)…[`5`](videos/mcp-hands-on-5/LOG.md) | MCP Inspector + demo server (`app.mjs`) | Becky, trying it herself |

There are two renderers:
- **`render.mjs`** tours a diagram template in the AgentFlow app.
- **`app.mjs`** records a *hands-on* episode. It drives a real app (the MCP Inspector) against a real server,
  with real terminal commands; see below. With `setup.app: 'agentflow'` it drives the AgentFlow app itself
  (e.g. the RAG Eval Visualizer), running a hidden `setup.prelude` of clicks before recording.

## Setup (once)

```sh
cd tools/explainer-video
./setup.sh        # checks node/ffmpeg/uv, installs Playwright + Chromium, downloads the Kokoro voice (~350 MB)
```

Needs `ffmpeg` and `uv` (`brew install ffmpeg uv`). Caches go in `.cache/` and renders in `out/`; both are git-ignored.

## Make or update a video

1. Start the app in the repo root: `npm run dev` (the renderer uses `http://localhost:5173`; override with `APP_URL`).
2. Edit `videos/<id>/video.mjs`, or create a new folder for a new video (copy an existing one).
3. **Preview stills.** This is fast and catches nearly every problem:
   ```sh
   node render.mjs <id> --stills scenes        # one frame per scene → out/<id>/stills/
   node render.mjs <id> --stills 81,130.5      # frames at given seconds (look up times in transcript.md)
   ```
4. **Render** (about 2× real time, so a 5-minute video takes about 10 minutes):
   ```sh
   node render.mjs <id>                        # → out/<id>/<id>.mp4
   ```
5. Add an entry to `videos/<id>/LOG.md`: what changed, why, and any feedback that drove it.

Every run rewrites two files:
- `videos/<id>/transcript.md`: timestamps, captions, character lines, and card text.
- `videos/<id>/youtube.md`: the title, the description with **chapters computed from the real timeline**, and tags.

To refresh only those two, without rendering frames, run `node render.mjs <id> --meta`. Commit them with the
scenario, so the history of what the video says is readable in git.

## Scenario format (`video.mjs`)

```js
export default {
  template: 'Conversational RAG',             // exact template name in the Templates panel
  title: { kicker, heading, sub },            // intro title card
  summary: ['Screen', 'Rewrite', …],          // outro words
  character: { label: 'Leo', anchor: 'User Question', side: 'left', startMood: 'frustrated', look: { … } },
  speak: [[/\bRAG\b/g, 'rag']],               // pronunciation fixes (captions keep the original text)
  voice: 'af_heart', speed: 1.0,              // optional; Kokoro voice
  youtube: { title, description, tags },      // required; chapters are appended automatically
  scenes: [
    {
      chip: '03 · Retrieval',                 // top-left label
      focus: ['Retriever', 'Knowledge Base'], // nodes kept bright and framed; '*' = whole diagram
      cam: ['…'],                             // extra nodes to frame without highlighting them
      edges: [['Query Embedder', 'Retriever', '#fbbf24', 'rev'?]], // glowing edges with moving packets
      card: { title, items: [{ line: 0, text: 'html' }] },        // right-hand checklist; items light up with their line
      char: {
        moods: [{ line, delay?, mood }],      // frustrated | neutral | curious | happy
        pops: [{ line, delay?, kind: 'say' | 'assistant' | 'consent', text, who? }], // who: assistant pop-up header
        approve: { line, delay? },            // flips the consent prompt to "✓ Approved"
      },
      lines: ['Narration, one TTS clip per line, shown as the caption.'],
      title: true, summary: true,             // mark the intro / outro scenes
      chapter: 'Results & back to Becky',     // optional YouTube chapter name; same name = one chapter
    },
  ],
};
```

Nodes are referenced by their **label** as shown on the canvas. The character is referenced by `character.label`.
Edge colors used so far: amber `#fbbf24` for requests, red `#f87171` for rejections, green `#34d399` for results.

The character's `look` takes:
- `tag`
- `hairStyle: 'long' | 'short'`
- `hair`, `skin`, `neck`, `nose`
- `outfit: 'blazer' | 'hoodie'`
- `top`, `topShade`
- `glasses`, `earrings`

The default look is Becky.

## Hands-on episodes (`app.mjs`)

`node app.mjs <id> [--stills …] [--frames N] [--meta]` uses the same narration, transcript, and YouTube
pipeline as `render.mjs`. Each run:
1. starts the demo server (`acme-crm-mcp`, override with `ACME_DIR`) and the pinned MCP Inspector fresh
2. resets the database
3. mints `setup.tokens`
4. writes the Inspector's server list from `setup.servers`
5. plays the scenario

Extra scene keys (documented in the header of `app.mjs`):
- `do`: timed actions: click, type, paste, press, run, clear
- `highlight`: rings with labels and optional dimming
- `terminal`: show the terminal panel (`left` / `right` / `full`)
- `cardPos` / `cardTop` / `cardFrom`: where and when the card appears

Targets are visible-only matches (`text=…`, `label=…`, `placeholder=…`, `role=[…]`, `switch=<server>`, or CSS).
A failed action is reported and saved as `out/<id>/failed-<t>s.png`.

Stills fast-forward through the actions, with proportional real pauses and a 2.5 s settle, so they match
the video. Layout is 1280×720 captured at 1.5× (1920×1080 output).

## Conventions (learned the hard way)

- **Explain the diagram; don't sell the template.** No "load the template" calls to action. The intro says
  "This diagram shows…".
- **Keep each scene's `focus` tight.** The camera fits every focused node, so one node at the far end of the
  diagram zooms everything out until it's unreadable. Highlighted edges still glow when they run off-screen.
- **Use a story with a character, not a tour of boxes.** Give the character a real request, follow it through
  the flow, and bring the answer back to them. Mood changes should land on narration beats.
- **Detail goes on cards, not in long captions.** Keep each narration line to one or two sentences.
- **Narration must match the template.** Review the template before scripting. If the video would have to
  explain around a flaw, fix the template first.
- **Always look at stills before a full render.**
- **Hands-on: the screen must agree with the voice.** Terminal output and UI state are real, so read every
  still against its caption. Timing-dependent results (rate-limit refills, reconnects) should run in one
  command or with enough narration to cover them. Never narrate a result you haven't seen in a still.
  If a live result can't be produced (for example no API key), say so on screen instead of faking it.
- **Every video ships with a YouTube title and description.** Title ≤ 100 characters. The description is a
  hook question, the character's story in a sentence, then "What you'll learn" bullets. Chapters are generated;
  never write them by hand.
- Audio is cached by a hash of voice + speed + spoken text, so editing a line re-synthesizes only that line.

## Files

| File | What it does |
|---|---|
| `render.mjs` | narration → timeline → in-page director → frames → ffmpeg; writes the transcript |
| `character.js` | SVG character: looks, expressions, blink, bounce, speech, consent and assistant pop-ups |
| `tts.py` | Kokoro TTS (run through `uv`, isolated Python 3.12) |
| `setup.sh` | one-time setup |
| `videos/<id>/video.mjs` | the scenario |
| `videos/<id>/transcript.md` | generated transcript |
| `videos/<id>/youtube.md` | generated YouTube title, description, chapters, and tags |
| `videos/<id>/LOG.md` | version history, feedback, decisions |
