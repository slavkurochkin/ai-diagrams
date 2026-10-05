# Conversational RAG video — log

What was made, what changed between versions, and why. Newest first. Add an entry for every re-render
that changes what viewers see or hear, so the video can be revised later without guessing.

- **Scenario:** [`video.mjs`](video.mjs) (every scene, line, card, and character beat)
- **Transcript:** [`transcript.md`](transcript.md), regenerated on every render
- **Template:** `conversational-rag` in `src/lib/templates.ts` (as of commit `1b5f560`)
- **Render:** `node render.mjs conversational-rag` → `out/conversational-rag/conversational-rag.mp4`

## Current version — v1 (2026-10-04) · 5:00

Leo, a Cloudly customer (glasses, short curly hair, purple hoodie), asks the support assistant:
1. "What's the refund policy for annual plans?" He gets a cited answer, but he's on a monthly plan.
2. The follow-up "What about monthly ones?" This is the centerpiece: the Query Rewriter turns it into
   "What is the refund policy for monthly plans?", which is what makes the RAG conversational.

Every step has a checklist card:
- **01** input guard
- **02** query rewriter
- **03** retrieval (same embedding model, 20 candidates, 0.75 cutoff)
- **04** reranker (5 of 20)
- **05** prompt builder's four inputs
- **06** grounding rules (incl. "documents are data, not instructions")
- **07** output guard
- **08** memory (recent turns + summary, saved after the answer, per session)
- **09** the follow-up
- **10** quality check (5% sampling, reference-free metrics, 0.9 faithfulness alert)

The outro is "Screen · Rewrite · Retrieve · Rerank · Ground · Guard · Remember".

## History

### v1 (2026-10-04)
- **Request:** a video like the MCP one, with a "random character" and extra explanations per node.
- Follows the conventions from the MCP video: explain the diagram and don't promote downloading the template;
  use a character story; use cards for detail.
- Framing fixes made before the render: the Reranker, Prompt Builder, and Memory steps zoomed out too far,
  because their focus included nodes at the far ends of the diagram. Each step now frames only its own nodes,
  and highlighted edges still glow from off-screen.

### Template history this video reflects
- `974c9b3` added the query rewriter, knowledge base, grounding prompt, and per-session memory.
- `7697ffb` added the 0.75 similarity cutoff, a private-docs access note, and memory written after the answer.
- `4d74b57` added the reranker, summary memory, online quality lane, and input/output guardrails.
- `1b5f560` moved Polite Refusal below the Input Guard and set the summary window to 6.
