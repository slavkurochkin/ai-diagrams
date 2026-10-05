# YouTube — Evaluating Conversational RAG

Generated from `video.mjs` (`youtube` block) on every render; chapters come from the real timeline. Paste as-is.

## Title

How to Evaluate a Conversational RAG Assistant: Follow-Ups, Grounding, Leaks & Latency

## Description

```
How do you know your RAG assistant still answers follow-up questions correctly, and never leaks internal documents, after you change something?

Priya is about to ship a faster search index for the support assistant from our Conversational RAG walkthrough. Her eval replays scripted conversations, and the first run catches a leak no customer ever saw.

What you'll learn:
• Building a test set of scripted multi-turn conversations, with an answer key that never reaches the model
• Scoring follow-up question rewriting with an LLM judge, with good and bad examples
• Recall@k, precision@k and F1@k in plain words, with a worked example
• Telling retriever problems from reranker problems with candidate recall vs. reranked recall
• Grading answers against references: correctness, citations, and "I don't know" instead of guessing
• Catching data leaks three ways, and why a canary alone misses paraphrased leaks
• Separate quality, access, and latency gates, and why a leak rate must never be averaged in

Chapters
0:00 Intro
0:18 Meet Priya
0:39 The test set
1:21 Two loops
1:49 The answer key stays hidden
2:15 Same pipeline as production
2:48 Scoring follow-up rewriting
3:18 Scoring retrieval
3:57 Recall, precision & F1
4:47 Scoring answers
5:13 Checking for leaks
5:55 Scoring whole conversations
6:25 Latency
6:45 Three gates
7:19 The first run fails
7:56 Fixed and shipped
8:15 Summary
```

## Tags

RAG, RAG evaluation, LLM evaluation, evals, precision and recall, conversational AI, LLM as a judge, AI testing, data leakage, access control, AI architecture, retrieval augmented generation
