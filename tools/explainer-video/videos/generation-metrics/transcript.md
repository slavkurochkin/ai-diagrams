# Generation Metrics, Explained — transcript

Generated from `video.mjs` on every render. Total 5:10 · voice `af_heart` at 1.0× · template "undefined".

## 0:00 · Overview

- **0:01** Retrieval found the right documents. But did the model use them, or did it make something up?
- **0:06** In this video: the four metrics that grade the answer itself, worked out on one example.

## 0:12 · Priya is back

- **0:14** Priya’s retrieval scores look great. But users still report wrong answers.
  - _Priya:_ My retrieval scores look great. So why do users still get wrong answers? 🤔
- **0:19** Retrieval is only half of RAG. The other half is the model that writes the answer.
- **0:24** So the RAG evaluator grades the answer too. Most of these checks are done by an LLM judge, the one from the last video.

## 0:32 · 01 · Faithfulness

- **0:34** Let’s open it. Back to Leo’s question: “What about monthly ones?” Here are the five chunks the model was given.
- **0:41** Faithfulness asks one thing: is everything in the answer backed by these chunks? Anything the chunks don’t back is a hallucination.
- **0:49** Here’s how it’s measured. Step one: a judge splits the answer into single claims, one fact each.
- **0:55** Step two: it checks each claim against the chunks, and notes where it found it.
- **1:00** All three claims are supported. Faithfulness: three of three, a perfect one.

## 1:05 · 02 · Catching a hallucination

- **1:07** Now an answer that makes things up. It starts well, then promises a prorated refund, arriving in five business days.
- **1:14** The refund claim is contradicted: the docs say partial months are not refunded.
- **1:19** And no chunk mentions five business days. That was simply invented.
- **1:24** Two of four claims are supported: faithfulness 0.5. That’s how a hallucination shows up in the numbers.

## 1:32 · 03 · True isn’t enough

- **1:33** This one adds: “you can cancel from the mobile app.” Maybe that’s even true.
- **1:37** But no retrieved chunk says it. It came from the model’s memory, so it counts against faithfulness: 0.75.
- **1:45** Faithfulness doesn’t ask “is it true?” It asks “can I trace it to the documents?” That’s what keeps a RAG answer checkable.

## 1:53 · 04 · Faithful, but wrong

- **1:55** And the opposite trap. This answer is about annual plans. Its claim is backed by a chunk, so faithfulness is a perfect one.
- **2:03** But Leo asked about monthly plans. Faithful isn’t the same as useful. That needs a second metric.

## 2:10 · 05 · Answer relevancy

- **2:11** Answer relevancy asks: does the answer address the question that was asked?
- **2:16** It’s measured backwards. A model reads only the answer, and writes the questions that answer would fit.
- **2:22** Each one is compared to Leo’s real question, by meaning, not by shared words. These are close, about 0.9 each. Relevancy: 0.93.
- **2:33** For the annual-plans answer, the questions are all about annual refunds. Similarity drops to around 0.5. Relevancy: 0.47.
- **2:43** But watch this: the made-up answer still scores 0.9. Relevancy checks the topic, not the truth. So you always need both.

## 2:53 · 06 · Context recall

- **2:54** The last two metrics grade what the model was given. Remember the golden set’s must-include facts? Here they are.
- **3:01** Context recall: how many of those facts appear somewhere in the retrieved chunks? All three: a perfect one.
- **3:08** Now the partial-months chunk never came back. Two of three facts: 0.67.
- **3:13** However good the model is, it can’t use a fact it never received.

## 3:18 · 07 · Context precision

- **3:19** Context precision asks: are the useful chunks near the top? Here they’re ranks one and two, so precision is one.
- **3:26** Now the same chunks, ranked third and fifth. At rank three, one of three chunks so far is useful. At rank five, two of five.
- **3:34** Precision averages those: 0.37.
- **3:38** Recall is still one: nothing is missing. But the model has to dig past noise first, and models tend to miss what’s buried.
- **3:46** Unlike faithfulness and relevancy, these two need the reference answer, so they run on the golden set, not on live traffic.

## 3:54 · 08 · Where did it go wrong?

- **3:56** Now put the four together, because they point to where the problem is. A healthy answer: all four high.
- **4:02** Faithfulness drops, but retrieval is fine: the generator made things up. Tell it to answer only from the chunks, and cite them.
- **4:09** Context recall drops, but faithfulness is fine: the retriever missed a fact. Fix the chunking, top k, or the search.
- **4:17** Relevancy and precision both drop: the follow-up wasn’t understood. That’s why Leo’s question gets rewritten into a standalone one before retrieval.

## 4:28 · Grading the answer

- **4:29** So, how do you grade an answer?
- **4:31** Faithfulness catches hallucinations: claims the chunks don’t back, even true ones.
- **4:36** Answer relevancy checks it answered the question that was asked.
- **4:40** Context recall and precision check what the model was given, against the golden set.
- **4:46** And since a judge computes most of them, check that judge against people, just like in the last video.
- **4:52** Priya’s next report won’t just say an answer is wrong. It’ll say where it went wrong.
  - _Priya:_ Now my report says where it went wrong, not just that it did. 😄

> **Card — Grading the answer**
> - Faithfulness: every claim backed by the chunks. The hallucination check
> - Answer relevancy: answers the question asked. On topic, not necessarily true
> - Context recall & precision: the needed facts arrived, near the top. Needs a reference
> - Judged by an LLM: check the judge against people

## 4:57 · Summary

- **4:59** Faithfulness. Answer relevancy. Context recall. Context precision.
- **5:04** Grade the answer and what it was given, and you’ll know where to look.
  - _Priya:_ Thanks! 😄
