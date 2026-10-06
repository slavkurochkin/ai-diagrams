# LLM-as-a-Judge, Explained — transcript

Generated from `video.mjs` on every render. Total 9:37 · voice `af_heart` at 1.0× · template "undefined".

## 0:00 · Overview

- **0:01** Many AI eval scores aren’t computed by a formula. Another model reads each answer and grades it.
- **0:08** This is called LLM-as-a-judge. Let’s see how it works, and how you know you can trust it.

## 0:14 · Priya is back

- **0:15** Priya’s eval pipeline is full of scores like this. Today she looks at where they come from.
  - _Priya:_ Half my scores come from a model grading another model. Who checks the grader? 🤔
- **0:20** Each test question goes to the model being tested, and it writes an answer.
- **0:25** Then a second model, the judge, reads that answer and grades it.

## 0:29 · Why a judge?

- **0:31** Why not just compare the text? Because “cancel anytime” and “cancel whenever you like” mean the same thing, but don’t match word for word.
- **0:39** A person sees that instantly. But nobody can read five hundred answers on every release.
- **0:45** So we use a model, like a teacher grading essays. A good teacher needs two things. First, an answer key: what a good answer should say.
- **0:53** Second, a marking scheme: what earns points. For a judge, the answer key is the golden dataset, and the marking scheme is the rubric.

## 1:02 · 01 · The answer key

- **1:04** Let’s open the judge. First, the answer key.
- **1:07** A golden dataset is a list of test questions, each with an answer you’ve agreed is right. Here’s one: Leo asks “what about monthly ones?”, right after asking about annual plans.
- **1:18** Its reference answer was written from the billing policy, document two. It also lists the facts any good answer must include.

## 1:26 · 02 · Building the answer key

- **1:28** So where does it come from? Step one: collect real questions, from logs and support tickets. A model can help draft more. We’ll get to that in a moment.
- **1:37** Two: pick a balanced mix. Easy questions, hard ones, follow-ups, and questions the docs can’t answer, where the right reply is “I don’t know”. Fifty to two hundred is a good start.
- **1:49** Three: someone who knows the subject writes each reference answer from the source documents, and a second person reviews it.
- **1:56** Four: people label real answers pass or fail. Remember these labels. Later, they’re how we check the judge.
- **2:03** Five: keep part of the set hidden for testing, version it, and add every failure you find in production.

## 2:10 · 03 · Synthetic data

- **2:11** Real questions are best, but there are rarely enough of them, especially for a new feature. So teams generate more: synthetic data.
- **2:20** A model reads a chunk of the docs, here the monthly billing policy, and drafts test questions from it.
- **2:26** It can make different kinds: rewordings that sound like real users, traps with a tempting wrong answer, and questions the docs can’t answer.
- **2:35** But drafts have problems. Some copy the doc’s exact wording, so they’re far too easy. Others sound like no real user. So a person reviews every one, and keeps only the good ones.
- **2:47** Even after review, synthetic questions tend to be easier. Here the judge passes ninety-four percent of synthetic questions, but only seventy-eight percent of real ones.
- **2:57** So tag synthetic items, mix them with real ones, and watch that gap. And don’t let the same model write the questions and grade the answers: they’d share the same blind spots.

## 3:09 · 04 · The rubric

- **3:11** Now the judge grades an answer. Here’s the question and the reference from the golden set, and the answer to grade.
- **3:17** The judge doesn’t just say “looks good”. Under the hood, it gets a prompt.
- **3:22** The prompt holds the question, the reference answer, the answer to grade, and the rubric: four criteria, each with a short definition.
- **3:30** It replies with a pass or a fail for each criterion, plus a reason, so a person can check its work.
- **3:37** Here are those verdicts. This answer passes all four, so it scores a perfect one.

## 3:42 · 05 · Weights

- **3:44** Now the same answer, without a citation. One criterion fails: cites a source.
- **3:49** Some criteria matter more, so they carry more points. Correct is worth three, citing a source two, the others one each. Seven points in total.
- **3:58** This answer keeps five of the seven points. Five divided by seven: 0.71.
- **4:05** A confident guess gets only the point for being short. One of seven: 0.14.

## 4:11 · 06 · Pass or fail?

- **4:13** Back to the answer with no citation, at 0.71. Is that good?
- **4:18** On a one-to-five scale, it’s a four. Sounds fine.
- **4:21** But with a pass mark of 0.75, it fails.
- **4:25** Same answer, different story. So choose the scale and the pass mark up front, before you see any results.

## 4:32 · 07 · Blind spots

- **4:33** This padded answer is correct and cited, but wrapped in filler. Only “concise” fails, so it scores 0.86.
- **4:41** Remove “concise” from the rubric, and the same answer scores a perfect one.
- **4:46** The judge only checks what the rubric asks for. Anything you leave out, it can’t see.

## 4:51 · 08 · Noise

- **4:53** Next: is the judge consistent? Here’s the same answer, graded five times on the one-to-five scale.
- **4:59** Four, five, four, three, four. Same answer, different scores, because a model’s replies vary a little each time. With a pass mark of four, run four fails it.
- **5:10** How much do the scores vary? That’s what the standard deviation measures. Here’s how it’s worked out.
- **5:15** First, the average: four. Then each run’s distance from it: zero, one, zero, one, zero.
- **5:22** Square those, average them, and take the square root: 0.63. So a typical run lands about 0.63 away from the average.
- **5:32** Fix one: pin the model. Use one fixed model version and temperature zero, so the same input gets the same reply. Now every run scores four.
- **5:41** Fix two, for models you can’t pin: run the judge several times and average. The average of five runs wobbles far less than one run: about 0.28, instead of 0.63.

## 5:55 · 09 · Judge bias

- **5:56** Judges have biases too. Here’s one that matters when Priya changes her prompt.
- **6:01** To compare her old prompt with a new one, the judge reads both answers to the same question, and picks the better one. Here, both answers say the same thing.
- **6:11** Shown the old prompt’s answer first, the judge picks the old prompt. So should Priya keep it?
- **6:17** Swap the order. Shown the new answer first, it picks the new one. It’s choosing by position, not by quality. That’s position bias.
- **6:25** The fix: always judge both orders, and if the winner changes, call it a tie. Here neither prompt is better, so Priya doesn’t switch, or stay, for the wrong reason.
- **6:35** Position is just one bias. Judges also prefer longer answers, and answers from their own model family. And many pass too much. Each one has a fix.

## 6:46 · 10 · Can we trust it?

- **6:47** Last part: can we trust the judge? We’ll answer three simple questions.
- **6:52** Question one: does it agree with people? Priya asked a colleague to grade twelve answers by hand, pass or fail. That’s the “person” column. The judge grades the same twelve.
- **7:03** Red rows are where they disagree. Version one agrees on nine of twelve: seventy-five percent.
- **7:09** It passed two confident guesses, and failed a short answer that was fine.

## 7:14 · 11 · Fix the rubric

- **7:16** So Priya fixes the rubric: a guess always fails, and a short answer is fine if it’s complete.
- **7:22** Now it agrees on eleven of twelve: ninety-two percent.

## 7:26 · 12 · Better than guessing?

- **7:28** Question two: is it better than guessing? Meet the lazy judge. It says pass to everything, without reading a word.
- **7:34** Eight of the twelve answers really are good, so it’s right eight times out of twelve: sixty-seven percent, for free.
- **7:41** That free score is what chance alone gets. Cohen’s kappa asks how much better than chance a judge does.
- **7:48** The lazy judge does no better, so its kappa is zero.
- **7:51** Version two closes most of the gap between chance and perfect: kappa 0.8. Aim for at least 0.6.

## 8:00 · 13 · Enough labels?

- **8:01** Question three: did we check enough answers?
- **8:04** With only twelve, each answer is worth about eight percentage points. One more disagreement, and ninety-two percent drops to eighty-three.
- **8:12** So ninety-two is a rough number. The margin of error says how rough. It comes from this formula: the agreement, the number of labels, and a factor of two for ninety-five percent confidence.
- **8:24** For twelve labels, it’s plus or minus sixteen points. The real agreement could be anywhere from seventy-six percent to a hundred.
- **8:33** With two hundred labels, each answer is worth half a point, and the margin shrinks to plus or minus four: eighty-eight to ninety-six.
- **8:41** So label a hundred to two hundred answers before you trust the number.

## 8:46 · A judge you can trust

- **8:47** So, what makes a judge you can trust?
- **8:50** A golden dataset, built from real questions, plus reviewed synthetic ones.
- **8:55** A clear rubric and pass mark, set before you see results.
- **8:58** A pinned model, with comparisons judged in both orders.
- **9:02** And a check against people: it agrees with them, it beats chance, and you labeled enough answers to be sure.
- **9:09** Priya’s scores still come from a model. But now she knows when to trust them.
  - _Priya:_ Now I know when to trust a score, and when to check it. 😄
- **9:13** Next time, she puts the judge to work on the biggest question of all: is the answer faithful to the documents, or did the model make it up?
  - _Priya:_ Next: catching answers that make things up! 🔍

> **Card — A judge you can trust**
> - A golden dataset: real questions, plus reviewed synthetic ones
> - A clear rubric and pass mark, set in advance
> - A pinned model, comparisons judged both ways
> - Checked against people: agrees · beats chance (κ ≥ 0.6) · 100–200 labels

## 9:22 · Summary

- **9:23** Golden set. Rubric. Noise. Bias. Then three checks: agreement, kappa, and margin of error.
- **9:30** A judge is a measuring tool. Check it against people, and you can trust its scores.
  - _Priya:_ Thanks! 😄
