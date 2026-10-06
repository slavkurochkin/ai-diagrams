# LLM-as-a-Judge, Explained — transcript

Generated from `video.mjs` on every render. Total 4:39 · voice `af_heart` at 1.0× · template "undefined".

## 0:00 · Overview

- **0:01** Most RAG eval scores aren’t computed by a formula. Another model reads the answer and grades it.
- **0:07** In this video, we open up the LLM judge: how it scores, where it goes wrong, and how you know you can trust it.

## 0:15 · Priya is back

- **0:16** Priya’s eval report leans on LLM judges for most of its scores. Today she checks how they work.
  - _Priya:_ Half my scores come from a model grading another model. Why should I trust it? 🤔
- **0:23** The judge gets three things: Leo’s question, a reference answer written in advance, and the answer to grade.

## 0:30 · 01 · A rubric, not a vibe

- **0:32** It doesn’t just say “looks good”. It checks the answer against a rubric, one criterion at a time: correct, cites a source, complete, concise.
- **0:41** For each one, it gives a verdict and a one-line reason, so a person can check its work.
- **0:46** This grounded answer passes all four. Score: one.

## 0:50 · 02 · Weights

- **0:52** Now the same facts, without a citation. One criterion fails: cites a source.
- **0:57** Criteria have weights. Correctness counts three, citations two, the rest one each. So this answer keeps five of seven points: 0.71.
- **1:07** A confident guess fails almost everything. Only “concise” survives, and being short and wrong isn’t worth much: 0.14.
- **1:16** The weights are a decision you make once, in advance, about what matters most.

## 1:21 · 03 · The scale

- **1:23** The same result can be reported on different scales, and they tell different stories.
- **1:27** On a one-to-five scale, 0.71 becomes a four. Sounds good.
- **1:32** As pass or fail, with a pass mark of 0.75, it fails.
- **1:37** Neither is wrong. Pick the scale for the decision you’re making, and set the pass mark on purpose, not by habit.

## 1:45 · 04 · What you leave out

- **1:46** Here’s a padded answer: correct and cited, wrapped in three sentences of filler. Only “concise” fails.
- **1:53** Drop “concise” from the rubric, and the same answer scores a perfect one.
- **1:57** A judge only measures what the rubric names. Whatever you leave out, it won’t see.

## 2:03 · 05 · Noise

- **2:04** Next problem: a judge is a model, and models vary. The same answer, judged five times.
- **2:11** Four, five, four, three, four. With a pass mark of four, run four fails an answer the other runs pass.
- **2:17** The fix: pin the judge’s model version, and average a few samples instead of trusting one. Now it’s four, every time.

## 2:26 · 06 · Position bias

- **2:27** Judges also have biases. Ask one to compare two answers that say the same thing, A shown first.
- **2:33** It picks A. Is A better, or was it just first?
- **2:37** Judge both orders. Shown B first, it picks B. The winner follows the order, not the answers: that’s position bias, and the honest verdict is a tie.
- **2:46** Judges have other habits too: favoring longer answers, or answers written by their own model family. Every pairwise eval should swap the order.

## 2:56 · 07 · Check against humans

- **2:58** So how do you know a judge is good enough? You check it against people.
- **3:02** A person labels a sample of answers pass or fail, and the judge grades the same ones.
- **3:07** Rubric version one agrees on nine of twelve: seventy-five percent. The red rows show how it fails: it passed two confident guesses, and failed a short answer that was fine.

## 3:19 · 08 · Fix the rubric

- **3:21** Version two adds two rules: a guess scores zero, and short is fine if it’s complete.
- **3:26** Now it agrees on eleven of twelve. And the second number, Cohen’s kappa, doubles from 0.4 to 0.8.

## 3:34 · 09 · Why kappa

- **3:36** Why two numbers? Meet the lazy judge. It says pass to everything.
- **3:40** Because most answers in the sample really do pass, it still agrees sixty-seven percent of the time.
- **3:46** Kappa corrects for that. It asks how much better than chance the judge is, and the lazy judge scores exactly zero. As a rule of thumb, look for at least 0.6.

## 3:58 · A judge you can trust

- **3:59** So what makes a judge trustworthy?
- **4:02** A rubric with weights, written before you look at the results.
- **4:05** A scale and a pass mark, chosen on purpose.
- **4:08** A pinned model with averaged samples, and pairwise comparisons judged in both orders.
- **4:14** And regular checks against human labels, with kappa, not just agreement. Re-check whenever you change the judge’s model or prompt.
- **4:22** Priya’s scores still come from a model. But now she knows when to trust them.
  - _Priya:_ Now I know when to trust a score, and when to check it. 😄

> **Card — A judge you can trust**
> - A rubric with weights, written before you see results
> - A deliberate scale and pass mark
> - Pinned model, averaged samples · both orders for pairwise
> - Checked against people: agreement and κ ≥ 0.6, re-checked whenever the judge changes

## 4:27 · Summary

- **4:29** Rubric. Weights. Scale. Noise. Bias. Agreement.
- **4:32** An LLM judge is a measuring instrument. Calibrate it, and it earns your trust.
  - _Priya:_ Thanks! 😄
