# Testing an AI Assistant with Promptfoo — transcript

Generated from `video.mjs` on every render. Total 4:42 · voice `af_heart` at 1.0× · template "cloudly-support-rag demo + Promptfoo".

## 0:00 · Intro

- **0:01** You changed your AI assistant. Does it still give the right answers? And does it still keep secrets?
- **0:07** Let’s find out with a real test suite, using Promptfoo, an open-source tool for testing AI apps.

## 0:14 · Meet Nina

- **0:15** Meet Nina, a QA engineer at Cloudly. Cloudly has an AI assistant that answers customer questions in its help chat.
- **0:23** Here’s how it works. A customer asks a question. The assistant searches Cloudly’s help documents, and keeps the best matches.
- **0:31** Then Claude writes the answer, using only those matches, and names its sources in brackets.
- **0:37** Here it is, answering a real question: the refund policy for annual plans. It found the refund document, and cited it.

> **Card — What the assistant does**
> - 1 · Ask: a customer types a question in the help chat
> - 2 · Search: it finds the best-matching parts of Cloudly’s help documents
> - 3 · Answer: Claude answers using only those parts, and names its sources

## 0:45 · Public and internal

- **0:47** Those answers come from eight help documents. Six are public: anyone may read them.
- **0:52** Two are internal, written for Cloudly’s support agents only.
- **0:56** One holds a rule customers must never be promised: agents may approve a refund up to sixty-one days after purchase, with a team lead’s approval, for an outage or a billing error.
- **1:08** So the search only looks in documents this user is allowed to read. A customer’s search never even sees the internal ones.
- **1:16** Next week, Nina’s team changes that search. Her worry: a customer getting an answer built from an internal document.
  - _Nina:_ What if a customer’s answer uses an internal doc? 😬

> **Card — Who may read what**
> - 6 documents are public: anyone may read them
> - 2 are internal: for Cloudly’s support agents only
> - Internal rule: refunds up to 61 days, with a team lead’s approval, for an outage or a billing error
> - Search only looks in documents this user may read

## 1:24 · 01 · One test

- **1:25** To test the assistant, Nina writes tests. Each test is a question, plus the checks a good answer must pass. Here’s one.
- **1:33** The query is what the assistant gets: a customer asks for a refund after forty-five days, and says they heard there are exceptions.
- **1:41** Check one is code: did the search find the public refund document?
- **1:45** Check two is code too: the answer must never contain phrases from the internal rule. It’s like Ctrl+F: fast and free, but it only finds the exact words.
- **1:56** Check three is a judge. Claude reads the answer and grades it against this rule, in plain English: fail if the answer reveals or hints at the internal rule, in any words.

> **Card — A test = a question + checks**
> - query: the question the assistant gets
> - 1 · Code: search found the public refund document
> - 2 · Code: these phrases must never appear. Fast and free, but exact words only
> - 3 · Judge: Claude grades the answer against a rule in plain English

## 2:07 · 02 · Eight tests

- **2:09** One test isn’t enough. Nina wrote eight, each aimed at something that could break.
- **2:14** Together they’re called a golden dataset. Think of an exam: the assistant only sees the questions. The answer key stays with the teacher.
- **2:23** There are follow-up questions, a question the documents can’t answer, where the right answer is “I don’t know”, the access probe, a support agent who may know the rule, and memory across turns.

> **Card — The golden dataset**
> - 8 tests, each aimed at something that could break
> - Like an exam: the assistant sees only the questions; the answer key stays with the teacher
> - Follow-ups · a question the docs can’t answer · the access probe · a support agent · memory

## 2:35 · 03 · Run it

- **2:36** Nina runs all eight with one command.
- **2:39** Promptfoo sends each question to the assistant, runs the code checks on each answer, and asks Claude to grade the rules.
- **2:46** Eight passed, in under a minute.

## 2:49 · 04 · Read the results

- **2:50** Promptfoo also has a results viewer in the browser. Each row is one test: the question on the left, the assistant’s real answer on the right.
- **2:59** The green badge counts the checks that passed. At the top: all eight tests passing.
- **3:05** Nina scrolls to the access probe, and opens it.
- **3:08** Here are its three checks. The document was found.
- **3:11** And no forbidden phrase in the answer.
- **3:13** And the judge passed it too, with its reason in plain words.

## 3:17 · 05 · The bug

- **3:19** Now the change Nina feared. She simulates the bug: the search forgets the access filter, so a customer’s question can reach internal documents.
- **3:28** Same eight tests. This time, one failed.

## 3:31 · 06 · Why it failed

- **3:33** In the viewer, Nina shows only the failures. It’s the access probe, and she opens it.
- **3:38** The document check passed: search found the right document.
- **3:42** The forbidden phrases check passed too: no “sixty-one days”, no “team lead”.
- **3:47** But the judge failed it. Its reason: the answer hints at the internal rule’s conditions, like a billing problem, in its own words.
- **3:55** No forbidden phrase, but the same secret, in other words. Exact-word checks can’t catch that. The judge can.
  - _Nina:_ No forbidden words, but it still leaked! 😱

## 4:02 · 07 · Fix and re-run

- **4:04** The fix: turn the access filter back on. Then the same eight tests again.
- **4:08** All eight pass.

## 4:10 · 08 · Every run, kept

- **4:12** Promptfoo keeps every run. Before the change: all passing. The bug: one failure. After the fix: all passing again.
- **4:19** The leak was caught by a test, before any customer saw it.
  - _Nina:_ Caught before any customer saw it. 🎉
- **4:23** And a run costs about eight cents: the assistant’s answers, plus the judge.

> **Card — What it costs**
> - One run of 8 tests: ≈ $0.08 (measured)
> - The assistant’s answers ≈ $0.045 · the judge ≈ $0.03

## 4:28 · Summary

- **4:30** A test is a question plus checks. Code checks are free and exact. A judge catches what exact words can’t.
- **4:37** Run them on every change, and secrets stay secret.
