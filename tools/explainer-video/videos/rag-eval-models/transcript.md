# Which Claude Model? Test, Then Choose — transcript

Generated from `video.mjs` on every render. Total 3:19 · voice `af_heart` at 1.0× · template "cloudly-support-rag demo + Promptfoo model comparison".

## 0:00 · Intro

- **0:01** Bigger AI models cost more, and answer slower. But is a smaller one good enough for your app?
- **0:07** Don’t guess. Run the same tests on each model, side by side, and let the results decide.

## 0:13 · The question

- **0:15** Nina’s help-chat assistant runs on Claude Opus 5.5, the biggest model. Every answer costs money, and takes time.
- **0:23** Claude comes in smaller sizes too. Sonnet is mid-size. Haiku is the smallest: the cheapest, and the fastest.
  - _Nina:_ Do we really need the biggest model? 🤔
- **0:31** Would a smaller model be good enough? Instead of guessing, Nina test-drives all three on the same road.
- **0:37** And she already has the road: the eight golden tests, and the eighteen red-team attacks from the last video.

> **Card — Three Claude models**
> - Opus 5.5: the biggest, what the assistant uses today
> - Sonnet 5.5: mid-size · Haiku 4.5: the smallest, cheapest and fastest
> - Like test-driving cars: same road, same checks, for each one
> - The tests Nina already has: 8 golden tests, 18 red-team attacks

## 0:44 · 01 · The setup

- **0:45** The setup is one more config file. Under providers: the same assistant three times, each with a different model.
- **0:52** The tests come from the same file as Nina’s regular eval, so every model gets exactly the same eight questions and checks.
- **1:00** One thing doesn’t change: the judge. Opus grades all three, so differences come from the assistant, not from the grading.

> **Card — compare.yaml**
> - Three providers: the same assistant, a different model each
> - The same 8 tests, from one shared file
> - The judge stays on Opus 5.5 for all three: the grading must not change

## 1:08 · 02 · Side by side

- **1:10** Nina runs it once. In Promptfoo’s viewer, each model gets its own column.
- **1:15** Opus: all eight pass. Sonnet: all eight. Haiku: all eight.
- **1:19** Row by row, the answers say the same facts, cite the same documents, just in slightly different words.
- **1:26** She ran it a second time to be sure: twenty-four out of twenty-four again.

## 1:31 · 03 · Cost and speed

- **1:32** Now the column headers. Each one shows what that model’s eight answers cost, and how fast it replied.
- **1:39** Scale it up to ten thousand customer questions: about fifty-one dollars on Opus, twenty-three on Sonnet, and eight on Haiku.
- **1:47** And Haiku answers in about a second and a half, three times faster than Opus. Customers notice that.
- **1:53** The whole comparison took about two minutes, and cost about fifteen cents.

> **Card — Answers only, measured**
> - Per 10,000 answers: Opus ≈ $51 · Sonnet ≈ $23 · Haiku ≈ $8
> - Average reply: Opus 4.5 s · Sonnet 2.2 s · Haiku 1.4 s
> - The whole comparison: about 2 minutes, about $0.15 (judge included)

## 1:58 · 04 · And the attacks?

- **2:00** Passing friendly questions is one thing. Would a smaller model be easier to trick? Nina replays the eighteen recorded attacks against Sonnet and Haiku.
- **2:09** Sonnet blocks all eighteen. Haiku blocks all eighteen. Opus already did, in the last video.
- **2:15** Partly that’s the access filter: none of them ever sees the internal rule. Partly it’s the one-line fix from last time.

## 2:23 · 05 · The decision

- **2:25** Nina’s recommendation: switch the assistant to Haiku. Same tests passing, about six times cheaper, three times faster.
  - _Nina:_ Haiku, about six times cheaper. ✅
- **2:33** With one honest caveat. This only proves what the tests check: eight questions and eighteen attacks. Add tests for anything that matters to you before you switch.
- **2:43** The switch itself is a one-line change, in a pull request. So CI runs the eval on it, like any other change.
- **2:50** And the judge stays on Opus. Saving money on the assistant is fine; saving it on the grader means trusting worse grades.

> **Card — Nina’s recommendation**
> - Switch the assistant to Haiku 4.5: same tests passing, ~6× cheaper, ~3× faster
> - Only as good as the tests: 8 questions and 18 attacks, not every question customers ask
> - The switch goes through a pull request, so CI runs the eval on it
> - Keep the judge strong: a cheap judge can wave bad answers through

## 2:59 · Summary

- **3:00** Same tests, every model, side by side. Pick the cheapest one that passes, keep the judge strong, and let CI check the switch.
- **3:08** That’s how you choose a model with evidence, not a hunch.
- **3:12** If this helped, give it a like, and subscribe. There’s more coming on testing AI apps.
  - _Nina:_ Like & subscribe for the next one! 👍
