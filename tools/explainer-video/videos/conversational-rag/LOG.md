# Conversational RAG video — log

What was made, what changed between versions, and why. Newest first. Add an entry for every re-render
that changes what viewers see or hear, so the video can be revised later without guessing.

- **Scenario:** [`video.mjs`](video.mjs) (every scene, line, card, and character beat)
- **Transcript:** [`transcript.md`](transcript.md), regenerated on every render
- **Template:** `conversational-rag` in `src/lib/templates.ts` (as of the retrieval access-filter change, 2026-10-05)
- **Render:** `node render.mjs conversational-rag` → `out/conversational-rag/conversational-rag.mp4`

## Current version — v2 (2026-10-05) · 5:20

Leo, a Cloudly customer (glasses, short curly hair, purple hoodie), asks the support assistant:
1. "What's the refund policy for annual plans?" He gets a cited answer, but he's on a monthly plan.
2. The follow-up "What about monthly ones?" This is the centerpiece: the Query Rewriter turns it into
   "What is the refund policy for monthly plans?", which is what makes the RAG conversational.

Every step has a checklist card:
- **01** input guard
- **02** query rewriter
- **03** retrieval (same embedding model, 20 candidates, 0.75 cutoff, access filter from the login session)
- **04** reranker (5 of 20)
- **05** prompt builder's four inputs
- **06** grounding rules (incl. "documents are data, not instructions")
- **07** output guard
- **08** memory (recent turns + summary, saved after the answer, per session)
- **09** the follow-up
- **10** quality check (5% sampling, reference-free metrics, 0.9 faithfulness alert)

The outro is "Screen · Rewrite · Retrieve · Rerank · Ground · Guard · Remember".

## History

### v2 (2026-10-05)
- **Why:** the template now enforces the access filtering its retriever note had only promised. A new edge carries
  the session metadata from User Question to the Retriever's Access Filter, and the Retriever shows
  `FILTER access_groups overlaps…`. In v1 that new line would have appeared on screen, unexplained, right after
  the narration said only the rewritten query is searched.
- **Change:** step 03 gets two narration lines and two card items. The line carries who Leo is (access groups
  from his login session), not his words. It filters inside the search, so an internal support-agent playbook
  can never become a candidate. This follows the "show how, not just that" feedback: one concrete example.
- **Framing fix:** the new edge first rendered behind the Query Rewriter, so it looked like the rewriter's output.
  The edge now takes `lane: bottom`; forward edges can take a lane, which only loopbacks could before. It
  enters the Retriever from below, clearly coming from the question. Checked in the overview and in step 03.
- YouTube: a new "Access filtering" bullet and an `access control` tag.

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
