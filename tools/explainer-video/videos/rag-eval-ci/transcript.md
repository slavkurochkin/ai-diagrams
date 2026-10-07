# Run AI Tests on Every Pull Request — transcript

Generated from `video.mjs` on every render. Total 3:53 · voice `af_heart` at 1.0× · template "cloudly-support-rag demo + Promptfoo + GitHub Actions".

## 0:00 · Intro

- **0:01** Last time, Nina ran eight tests on her AI assistant by hand. But a test that someone has to remember to run, sooner or later, doesn’t run.
- **0:11** Today: running them automatically, on every pull request.

## 0:15 · Nina is back

- **0:16** Quick recap. Cloudly’s help-chat assistant answers from help documents. Some are internal, and customers must never get answers built from them.
- **0:26** Nina has eight tests for that, in Promptfoo. They catch problems, but only when someone remembers to run them.
  - _Nina:_ My tests only help if someone runs them… 🤔
- **0:32** So she puts them in CI, short for continuous integration. Think of a smoke detector: nobody presses a button. It checks all the time, and beeps when something’s wrong.
- **0:43** With CI, every pull request, every proposed code change, runs the tests automatically before anyone merges it.

> **Card — Tests that run themselves**
> - The assistant answers from help docs; internal docs must never reach customers
> - 8 Promptfoo tests check that, but only when someone runs them
> - CI (continuous integration): checks that run automatically, like a smoke detector
> - Pull request: a proposed code change, checked before it’s merged

## 0:51 · 01 · The workflow

- **0:53** The setup is one file in the repository: a GitHub Actions workflow. These are its steps.
- **0:59** It starts a fresh database, installs the assistant and Promptfoo, and indexes the help documents, just like on Nina’s laptop.
- **1:07** Then it runs the same eight tests. If any test fails, the whole check fails.
- **1:12** It also saves the results, and posts a summary on the pull request.
- **1:16** The Anthropic API key is stored as an encrypted GitHub secret. It’s never in the code.

> **Card — One file: .github/workflows/ai-eval.yml**
> - Fresh database, install, index the help docs, like on Nina’s laptop
> - Run the same 8 tests · any failed test fails the check
> - Save the results · post a summary on the pull request
> - The API key is a GitHub secret, never in the code

## 1:22 · 02 · A check for CI

- **1:24** Before CI, Nina added one more check.
- **1:27** The judge only reads the answer. And when the search goes wrong, the answer can still look harmless.
- **1:33** This check looks one step earlier: at what the search returned. If a customer’s search returns any internal document, the test fails.
- **1:41** It’s plain code: exact, free, and the same every run. And it runs on all eight tests.

> **Card — Look one step earlier**
> - The judge only sees the answer; a leaky search can still produce a clean-looking answer
> - This check sees what the search returned
> - Plain code: exact, free, the same every run · on all 8 tests

## 1:47 · 03 · The pull request

- **1:49** Then a teammate opens a pull request: Faster search. Simplify the query, so the vector index can do its job.
- **1:56** Here’s the change. The new query is shorter. And the line that kept customers away from internal documents, the access-group condition, is gone.
- **2:05** In a code review, this is easy to miss. It looks like a cleanup.

## 2:10 · 04 · CI goes red

- **2:11** CI runs on its own. Two minutes later, the check is red.
- **2:15** Setup and indexing passed. The step that failed is the eval: some of the tests failed.

## 2:21 · 05 · Which tests, and why

- **2:22** CI saved the results, so Nina opens them in Promptfoo’s viewer. Three of the eight tests failed.
- **2:29** She opens the first one: an ordinary question about annual refunds.
- **2:33** The new check failed. The customer’s search returned internal chunks, from the refund-exceptions document.
- **2:40** And the answer itself passed its judge: it happened to look fine. Without the search check, this test would have passed.
  - _Nina:_ Even the harmless-looking answers! 😱

## 2:47 · 06 · The fix

- **2:48** The fix: put the access-group condition back in the query.
- **2:52** The new commit runs CI again. This time the check passes.
- **2:55** All eight tests, green. Now the pull request is safe to merge.

## 3:00 · 07 · Lock the merge

- **3:02** The bug was caught before it was merged. No customer ever saw it.
- **3:06** One setting makes this a real gate. In GitHub’s branch protection, mark this check as required. Then the merge button stays locked until it’s green.
  - _Nina:_ Caught before it was merged. 🎉
- **3:15** That needs a public repository or a paid GitHub plan. On this demo, the red check warns, but can’t lock the merge.
- **3:23** Each run takes about two minutes, and costs about eight cents.

> **Card — Make it a real gate**
> - Branch protection → require the AI eval check: no green, no merge
> - Needs a public repo or a paid GitHub plan; here the check warns but can’t lock
> - Each run: about 2 minutes, about $0.08

## 3:27 · Summary

- **3:29** Tests in CI run on every change. A code check that looks at the search catches what an answer judge can miss. And a required check keeps the merge locked until it’s green.
- **3:40** That’s how a leak gets caught in review, not by a customer.
- **3:43** If this helped, give it a like, and subscribe. Next up: red-teaming, where Promptfoo tries to trick the assistant into leaking.
  - _Nina:_ Like & subscribe for the next one! 👍
