# YouTube — Retrieval Metrics, Explained

Generated from `video.mjs` (`youtube` block) on every render; chapters come from the real timeline. Paste as-is.

## Title

Retrieval Metrics Explained: Precision@k, Recall@k, F1, MRR and NDCG (Worked Example)

## Description

```
Your RAG eval says recall@5 is 50% and MRR is 0.25. What does that actually mean, and which number should you care about?

Priya, the engineer from our Conversational RAG eval video, works out every retrieval metric by hand on one example, Leo's question "What about monthly ones?", and watches each number change live as results move around.

What you'll learn:
• Precision@k: how much noise reaches the model
• Recall@k: what the model never got to see
• F1 and why it uses the harmonic mean, not the average
• What the k in @k does, and why pipelines retrieve 20 and keep 5
• MRR: why the rank of the first hit matters when precision and recall don't move
• NDCG: scoring the whole order, and which metric to watch at each stage

Chapters
0:00 Intro
0:14 Priya is back
0:38 Precision@k
0:55 Recall@k
1:14 F1
1:38 The k in @k
2:05 MRR: where is the first hit?
2:41 NDCG: the whole order
3:17 Which metric when
3:52 Summary
```

## Tags

RAG, precision and recall, recall at k, MRR, NDCG, F1 score, retrieval evaluation, information retrieval, LLM evaluation, evals, AI architecture
