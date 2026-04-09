# AgentFlow

A visual canvas for designing and animating AI system diagrams — pipelines, RAG flows, agent architectures, and evaluation setups.

## Getting Started

### Prerequisites

- Node.js 18+
- An OpenAI API key

### Setup

1. **Clone and install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your OpenAI API key:

   ```
   OPENAI_API_KEY=sk-...
   ```

3. **Run the app**

   Start both the frontend (Vite) and backend (Express) together:

   ```bash
   npm run dev:full
   ```

   Or run them separately:

   ```bash
   npm run dev      # frontend on http://localhost:5173
   npm run server   # backend API on http://localhost:3001
   ```

## Production (single server)

Build the client, then run Node with `NODE_ENV=production` so Express serves `dist/` and `/api` on one port (same-origin; no CORS needed for the SPA).

```bash
npm run build
NODE_ENV=production npm start
```

Open `http://localhost:3001` (or whatever `PORT` is). Health check: `GET /health`.

**Environment variables** (see `.env.example`):

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Server-side AI calls (omit on a free public demo if AI should stay off) |
| `ENABLE_SERVER_AI` | In **production**, must be `true` for AI routes to run. If unset/false, `/api` AI returns **403** — so you can deploy without others spending your key. **Not required in local dev.** |
| `PORT` | Listen port (many hosts inject this) |
| `CORS_ORIGINS` | Comma-separated list if the UI is **not** served by this app (cross-origin API) |
| `JSON_BODY_LIMIT` | Cap request body size (default `1mb`) |
| `API_RATE_LIMIT_MAX` | Max `/api` requests per IP per window (default `60` / 15 min) |
| `API_RATE_LIMIT_WINDOW_MS` | Rate-limit window in ms (default `900000`) |

**Deploy (e.g. Render):**

- **Build command:** `npm run build`
- **Start command:** `npm start` with `NODE_ENV=production` set in the dashboard (or rely on the platform default).
- Set `OPENAI_API_KEY` in the host’s secret env. Do not commit it.

### GitHub Pages?

**Not for this app as-is.** GitHub Pages only hosts **static files** (HTML/CSS/JS). It does **not** run Node or Express, so **`/api/*` and OpenAI would not work** — users would get errors when using AI features.

**Options:**

| Approach | What you get |
|----------|----------------|
| **[Render](https://render.com)** (recommended) | One **Web Service** runs `npm run build` + `npm start`: SPA + API on the same URL. This repo includes [`render.yaml`](render.yaml) for a [Blueprint](https://render.com/docs/infrastructure-as-code) deploy. Free tier spins down when idle. |
| **GitHub Pages + API elsewhere** | Build the SPA to Pages, host Express on Render/Fly and set `VITE_API_BASE_URL` — **not implemented** in this repo yet (all `fetch` calls use relative `/api`). |
| **GitHub Pages only** | Static files only; diagram UI loads but **every AI call fails** unless you add a backend URL feature. |

**Try Render now:** push to GitHub → [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint** → connect the repo → deploy. Leave `OPENAI_API_KEY` and `ENABLE_SERVER_AI` unset for a free canvas-only demo.

### Heroku and similar PaaS

| Platform | Notes |
|----------|--------|
| **[Heroku](https://www.heroku.com)** | Classic `git push heroku main` + **Procfile** (this repo includes [`Procfile`](Procfile) and `heroku-postbuild` so `dist/` is built on deploy). **No free tier anymore** — expect a small monthly cost for an always-on dyno. Set `NODE_ENV=production` in config vars; same env vars as above. |
| **Render / Fly.io / Railway / DigitalOcean App Platform** | Same idea: Node **Web** service, `npm run build` + `npm start`, set `PORT` from the platform. Render has a **free** (sleeping) tier; others vary. |

**GitHub Pages** remains static-only; **Heroku/Render/etc.** run your Express server.

## Tech Stack

- **Frontend**: React, ReactFlow, Framer Motion, Tailwind CSS
- **Backend**: Express (proxied via Vite in dev)
- **AI**: OpenAI API (explain, design review, eval suggestions)
