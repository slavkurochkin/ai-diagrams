# YouTube — Testing a RAG Assistant with DeepEval

Generated from `video.mjs` (`youtube` block) on every render; chapters come from the real timeline. Paste as-is.

## Title

Testing a RAG Chatbot with DeepEval: Golden Dataset, LLM Judges & Catching a Data Leak

## Description

```
Your RAG assistant answers well today. How do you prove it still will after the next change, and that it never shows customers internal documents?

Nina, a QA engineer, has to sign off on a change to her company's support assistant. She builds an answer key, runs DeepEval with Claude as the judge, and simulates the bug she fears most: a customer search that can see internal docs.

What you'll learn:
• What a golden dataset holds: messages, relevant docs, reference answers, forbidden facts, and canaries
• Cheap code checks vs. LLM judges, and when you need each
• Running a DeepEval suite and reading the results
• Why a canary check missed a paraphrased leak, and how a leak judge caught it
• What an eval run really costs, and how to test the judge itself before trusting a cheaper one

Chapters
0:00 Intro
0:14 Meet Nina
0:39 The assistant under test
1:07 The golden dataset
1:58 Code checks and LLM judges
2:37 Running the eval
3:08 Simulating a leak
3:46 Fix and re-run
4:04 Cost, and testing the judge
4:49 Summary
```

## Tags

RAG, DeepEval, LLM evaluation, AI testing, LLM as a judge, golden dataset, Claude, retrieval augmented generation, AI safety, data leak, QA, tutorial
