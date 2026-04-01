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

## Tech Stack

- **Frontend**: React, ReactFlow, Framer Motion, Tailwind CSS
- **Backend**: Express (proxied via Vite in dev)
- **AI**: OpenAI API (explain, design review, eval suggestions)
