# YouTube — LLM-as-a-Judge, Explained

Generated from `video.mjs` (`youtube` block) on every render; chapters come from the real timeline. Paste as-is.

## Title

LLM-as-a-Judge Explained: Golden Datasets, Rubrics, Bias & Cohen’s Kappa

## Description

```
Most AI eval scores come from another model grading the answer. How does an LLM judge work, where does its answer key come from, and how do you know you can trust it?

Priya, the engineer from our evaluation videos, treats the judge like a teacher grading essays: it needs an answer key (the golden dataset) and a marking scheme (the rubric). Then she checks the grader itself.

What you'll learn:
• What a golden dataset holds, and how to build one: real questions, expert reference answers, human labels
• Synthetic test data: how a model drafts questions from your docs, what goes wrong, and how to review it
• What the judge actually sees and returns: the prompt, and a pass/fail verdict per rubric criterion
• How weights, scales, and pass marks turn verdicts into a score, and what a rubric can't see
• Judge noise (standard deviation) and judge biases: position, length, self-preference, leniency
• Checking the judge against people: agreement vs. Cohen's kappa, the lazy judge with κ = 0, and the margin of error on 12 vs. 200 labels

Chapters
0:00 Intro
0:14 Where the judge sits
0:29 Why use a model as a judge
1:02 The golden dataset
1:26 How you build a golden dataset
2:10 Synthetic test data
3:09 The rubric: how the judge grades
3:42 Weights
4:11 Pass or fail?
4:32 What the rubric leaves out
4:51 Noise and standard deviation
5:55 Judge bias
6:46 Can we trust the judge?
7:14 Fixing the rubric
7:26 Better than guessing? (kappa)
8:00 Enough labels? (margin of error)
8:46 A judge you can trust
9:22 Summary
```

## Tags

LLM as a judge, golden dataset, synthetic data, LLM evaluation, evals, rubric, Cohen kappa, position bias, AI testing, AI architecture, Claude
