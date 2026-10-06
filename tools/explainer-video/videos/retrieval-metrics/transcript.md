# Retrieval Metrics, Explained — transcript

Generated from `video.mjs` on every render. Total 4:05 · voice `af_heart` at 1.0× · template "undefined".

## 0:00 · Overview

- **0:01** Precision, recall, F1, MRR, NDCG. Every RAG eval report is full of them.
- **0:08** In this video, we work out each one by hand, on a single example, and watch them change live.

## 0:14 · Priya is back

- **0:16** Remember Priya? Her eval report is full of these numbers, and today she works them out on one example.
  - _Priya:_ My report says recall 50%, MRR 0.25… what do these actually mean? 🤔
- **0:22** Leo asks: what about monthly ones? Two documents in the knowledge base answer it. The retriever returns five chunks, ranked one to five.
- **0:31** Green means a chunk is relevant: it helps answer the question. Red means it doesn’t. Only rank one is relevant.

## 0:38 · 01 · Precision@5

- **0:40** Precision at five asks: of the five chunks we returned, how many are relevant?
- **0:45** One out of five. Twenty percent.
- **0:47** Precision measures noise. The other four chunks still go into the prompt, cost tokens, and can distract the model.

## 0:55 · 02 · Recall@5

- **0:56** Recall asks the opposite question: of the documents that answer it, how many did we find? Two exist, and we found one.
- **1:04** One out of two. Fifty percent.
- **1:06** Recall measures what the model never got to see. A missed document can’t be quoted, however good the model is.

## 1:14 · 03 · F1@5

- **1:15** F1 combines the two, using the harmonic mean: two times precision times recall, divided by their sum.
- **1:23** Here, about twenty-nine percent. A plain average would say thirty-five.
- **1:27** The harmonic mean punishes imbalance. Return everything, and recall is perfect but precision collapses. F1 stays low unless both are good.

## 1:38 · 04 · What @k does

- **1:39** The k in “at k” is how many results we look at. Let’s raise it from five to ten.
- **1:45** Rank seven turns out to be the second relevant document.
- **1:48** Recall jumps to one hundred percent: both found. Precision stays at twenty: two out of ten. A bigger k finds more, and lets in more noise.
- **1:57** That’s why a RAG pipeline retrieves twenty candidates, for recall, and then a reranker keeps the best five, for precision.

## 2:05 · 05 · MRR

- **2:07** Back to five. Remember the relevant chunk was at rank one. Now watch what happens if it drops to rank four.
- **2:14** The same chunk, just lower in the list.
- **2:16** Precision: still twenty percent. Recall: still fifty. Neither one notices where the hit is.
- **2:22** MRR does. It’s one divided by the rank of the first relevant result. One over four: a quarter. At rank one, it was a perfect one.
- **2:32** Rank matters because the model reads from the top, and so do people. Averaged over many questions, that’s the mean reciprocal rank.

## 2:41 · 06 · NDCG

- **2:42** One more. Put both relevant chunks at the bottom: ranks four and five.
- **2:46** Precision forty percent, recall one hundred. Good numbers, but a bad ranking. And MRR only looks at the first hit.
- **2:54** NDCG scores the whole order. Each relevant result counts for less the lower it sits, and the total is compared with the perfect order. Here, about one half.
- **3:05** Now move them to ranks one and two. NDCG becomes a perfect one.
- **3:10** Same precision. Same recall. Very different ranking quality. That’s what NDCG is for.

## 3:17 · Which to watch when

- **3:19** So which one should you watch? It depends on the stage.
- **3:22** On the twenty candidates, recall: did we find the right document at all? If not, nothing later can fix it.
- **3:28** On the five that reach the prompt, precision: how much noise is the model reading?
- **3:33** F1, when you need one number that respects both.
- **3:36** And for ranking: MRR when one good document answers the question, and NDCG when several documents combine into the answer.
- **3:46** Priya’s report finally reads like a story: what was found, what was missed, and where it sat.
  - _Priya:_ Now my report actually makes sense! 😄

> **Card — Which metric, when**
> - Recall@20 on the candidates: did we find it at all?
> - Precision@5 on what reaches the prompt: how much noise?
> - F1: one number when both matter
> - MRR: one good document is enough; is it near the top?
> - NDCG: several documents combine; is the whole order right?

## 3:52 · Summary

- **3:54** Precision. Recall. F1. At k. MRR. NDCG.
- **3:58** Six numbers, one example, and now you know what each one is telling you.
  - _Priya:_ Thanks! 😄
