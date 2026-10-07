# YouTube — Run AI Tests on Every Pull Request

Generated from `video.mjs` (`youtube` block) on every render; chapters come from the real timeline. Paste as-is.

## Title

Run AI Tests on Every Pull Request: Promptfoo + GitHub Actions Catch a RAG Data Leak

## Description

```
Your AI tests only help if someone runs them. How do you run them on every pull request, and stop a bad change before it's merged?

Nina puts her Promptfoo tests into GitHub Actions. Then a teammate's harmless-looking "Faster search" pull request quietly removes the access filter, and CI catches it.

What you'll learn:
• What CI and pull-request checks are, in plain words
• A GitHub Actions workflow that runs a Promptfoo eval on every pull request
• Why a CI gate needs a deterministic check, not only an LLM judge
• Reading CI results in Promptfoo's viewer
• Making the check required, so the merge stays locked until it's green

If this helped, like and subscribe. Next up: red-teaming the assistant with Promptfoo.

Chapters
0:00 Intro
0:15 Why run tests in CI
0:51 The GitHub Actions workflow
1:22 A check you can gate on
1:47 A pull request with a hidden bug
2:10 CI goes red
2:21 Reading the CI results
2:47 The fix goes green
3:00 Make the check required
3:27 Summary
```

## Tags

Promptfoo, GitHub Actions, CI/CD, LLM evaluation, AI testing, RAG, pull request, LLM as a judge, Claude, data leak, QA, tutorial
