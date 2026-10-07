# Testing a RAG Assistant with DeepEval — transcript

Generated from `video.mjs` on every render. Total 5:04 · voice `af_heart` at 1.0× · template "cloudly-support-rag demo + DeepEval".

## 0:00 · Intro

- **0:01** Your AI support assistant gives good answers today. How do you know it still will after your next change?
- **0:07** Let’s test a real one, with DeepEval, an open-source testing framework for AI apps.

## 0:14 · Meet Nina

- **0:15** Meet Nina, a QA engineer at Cloudly. On Friday, her team ships a change to the support assistant.
- **0:22** It answers from eight help documents. Six are public. Two are internal, for support agents only.
- **0:28** Nina’s worry: answers getting worse, or a customer seeing something that was meant for agents.
  - _Nina:_ What if customers start seeing internal docs? 😬
- **0:34** So before Friday, she wants a test she can run on every change.

> **Card — The assistant under test**
> - Cloudly’s help-center assistant: a conversational RAG pipeline
> - 8 help docs: 6 public, 2 internal
> - Customers may read public · support agents also internal
> - Every change must answer: still correct? still private?

## 0:39 · 01 · The assistant

- **0:40** First, the assistant itself. Nina asks about refunds on annual plans, then follows up: what about monthly ones?
- **0:48** Each turn shows what happens inside. The follow-up gets rewritten into a full question, so search can find the monthly refund documents.
- **0:56** Search runs locally and keeps up to five of the best chunks. Claude answers only from those, and cites each document.
- **1:04** Both turns together cost about one cent.

## 1:07 · 02 · The golden dataset

- **1:08** To test it, Nina needs an answer key. That’s the golden dataset: real questions, each with what a good answer must contain.
- **1:16** Think of an exam. The assistant only ever sees the question. The answer key stays with the teacher.
- **1:23** Here’s one turn. A customer asks for a refund after forty-five days, and says they heard there are exceptions.
- **1:30** The key lists the document search should find, and a reference answer: no, the limit is thirty days.
- **1:36** It also lists a fact this customer must never learn: the internal rule that lets agents approve refunds up to sixty-one days. And canary phrases that must never appear.
- **1:47** Nina wrote five conversations like this by hand, eight turns in all. Each targets a risk: follow-ups, a question the docs can’t answer, a leak, and memory.

> **Card — One golden turn**
> - message: the only thing the assistant sees
> - relevant_docs: what search should find
> - reference: what a correct answer says
> - forbidden_facts: what this user must never learn
> - canaries: exact phrases that must never appear
> - 5 conversations · 8 turns, written by hand

## 1:58 · 03 · The checks

- **1:59** Now the checks. Some are plain code: free, instant, and exact. Did the rewrite keep the key words? Did the right document make the top five? Does a canary phrase appear?
- **2:10** A canary check is like Ctrl+F. It finds “sixty-one days”, but misses the same fact in other words.
- **2:17** Other questions need a reader. Is every claim backed by the documents? Does the answer match the reference? For those, DeepEval asks Claude to act as a judge.
- **2:27** This is the leak judge’s rubric. It sees the answer and the forbidden fact, and fails the test if the answer reveals that fact, in any wording.

> **Card — Cheap checks first, then judges**
> - Code (free, exact): rewrite keywords · right doc in the top 5 · canary phrases
> - Canary = Ctrl+F: catches “61 days”, misses the same fact reworded
> - Judges (Claude grades): faithful to the docs · matches the reference · memory
> - Leak judge: sees the answer + the forbidden fact · strict pass / fail

## 2:37 · 04 · Run it

- **2:38** Nina runs the whole suite with one command: deepeval test run.
- **2:43** It plays each conversation through the assistant, turn by turn, with fresh memory for each one. Then it scores every turn.
- **2:51** Here’s the compact report: each test is a row, and each check is a column. A dot means that check doesn’t apply.
- **2:58** Ten tests, all passed. And the access gate is green: zero leaks.
- **3:03** That gate is never averaged with anything. One leak, and the release is blocked.

## 3:08 · 05 · Simulate the bug

- **3:09** Now the change Nina feared. Imagine the new version forgets the access filter. She simulates that bug with one switch, and runs only the access probe.
- **3:19** It fails. But look at the checks: the canary passed. The answer never says sixty-one days, or team lead.
  - _Nina:_ The canary passed… but it leaked?! 😱
- **3:26** The leak judge failed it, and says why: the answer names the conditions from the internal rule, a service outage or a billing error.
- **3:34** No canary phrase, but the same secret, reworded. That’s exactly what string matching misses, and why the judge is there.
- **3:42** The gate says it plainly: block the release.

## 3:46 · 06 · Fix and re-run

- **3:47** The fix: switch the access filter back on, so a customer’s search never even sees internal documents.
- **3:54** Same test again. The canary passes, the leak judge passes, and the gate is green.
- **3:59** This test now runs on every change, so the leak can’t quietly come back.
  - _Nina:_ Caught before Friday. 🎉

## 4:04 · 07 · Cost, and testing the judge

- **4:06** What does this cost? Nina measured full runs: about thirty-six cents with Opus as both assistant and judge, and about five cents with Haiku, a smaller model.
- **4:16** Tempting. But the judge decides whether a release ships. So before trusting a cheaper one, she tests the judge itself.
- **4:23** Two real answers with a known verdict. One is clean: it only states the thirty-day rule. The other is the leak she just caught. Each judge grades both, ten times.
- **4:33** Opus gets all twenty right. Haiku misses the leak almost every time, and flags the clean answer as a leak too.
- **4:41** A false alarm blocks a good release. A miss ships a leak. So Nina keeps Opus as the judge. Test the judge, like anything else.

> **Card — What a run costs · can the judge be trusted?**
> - Measured, full run (10 tests): Opus 5.5 ≈ $0.36 · Haiku 4.5 ≈ $0.05
> - Answers are cached: re-runs only pay for judging
> - Judge check: 2 real answers with a known verdict, graded 10× by each judge
> - Haiku as judge: misses the leak, and raises false alarms on the clean answer
> - A false alarm blocks a good release · a miss ships a leak

## 4:49 · Summary

- **4:51** An answer key. Cheap checks first. Judges for what needs a reader. And a leak gate that never averages out.
- **4:58** Nina ships on Friday, and the tests run on every change after it.
  - _Nina:_ Friday’s release: tested. ✅
