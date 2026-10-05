# YouTube — Testing an MCP Server

Generated from `video.mjs` (`youtube` block) on every render; chapters come from the real timeline. Paste as-is.

## Title

How to Test an MCP Server: 5 Layers From Contract Tests to Production Evals

## Description

```
Your AI assistant can now write to your CRM. How do you know it won't leak another customer's data, delete the wrong contact, or fall for a trick hidden in the data?

Becky is back. In this follow-up to our multi-tenant MCP server walkthrough, each of her worries maps to a layer of testing, ordered from cheap and frequent to expensive and rare.

What you'll learn:
• Contract tests with no model in the loop: 401, 403, 429, and tenant isolation checked in the database
• How the “right” tool call is defined: golden test cases, seeded data, expected and forbidden calls
• Scoring tool calls: tool selection, arguments, order, and redundancy, and why you gate on the weakest model
• Red-teaming with poisoned data: prompt injection that arrives through tool results
• Noisy-neighbor load tests: one tenant floods, the others shouldn't notice
• Judging live tool calls in production, and a release gate that blocks on any failure

Chapters
0:00 Intro
0:15 Becky is back
0:34 Contract tests
1:04 Tenant isolation
1:29 Tool-use quality
1:55 What “right” means
2:37 Scoring the calls
3:20 Same request, different data
3:52 Deletes need consent
4:25 Gating on the weakest model
5:01 Security
5:24 Judging attacks
5:51 Load & noisy neighbor
6:12 Production
6:40 The release decision
6:56 Back to Becky
7:16 Summary
```

## Tags

MCP, Model Context Protocol, LLM evaluation, AI testing, evals, red teaming, prompt injection, load testing, multi-tenant, AI agents, Claude
