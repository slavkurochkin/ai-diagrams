# From Clicking to Automation — transcript

Generated from `video.mjs` on every render. Total 2:48 · voice `af_heart` at 1.0× · template "MCP Inspector CLI + acme-crm-mcp tests".

## 0:00 · Intro

- **0:01** Hands-on MCP, episode four: from clicking to automation.
- **0:05** Everything Becky checked by hand, a machine can check before every release.

## 0:10 · Clicking doesn’t scale

- **0:12** Becky clicked through tokens, tenants, floods, and bad input. It all worked. But nobody can click through all of that before every release.
  - _Becky:_ Clicking proves it once. But every release? 🤔

## 0:21 · 01 · The Inspector, scripted

- **0:22** First, the same Inspector, without the browser. Its command-line mode lists the tools, with their hints, as JSON.
- **0:30** And calls them. Search contacts, Priya. Same server, same token, same answer as in the browser, but now a script can read it.

## 0:39 · 02 · Exit codes are the test

- **0:40** The command line also reports how a call went through its exit code. Zero for success, three when authentication is required, five when the tool returned an error.
- **0:51** So a smoke test is just a list of calls and the exit codes they should produce. A valid call, no token, an unknown tool, a bad email.
- **1:00** Five checks, five passes, in seconds. Run it after every deploy, and a broken server never stays broken for long.

> **Card — Inspector CLI exit codes**
> - 0 → success
> - 3 → authentication required
> - 5 → the tool returned an error
> - Smoke test = calls + expected exit codes
> - Runs after every deploy, in seconds

## 1:08 · 03 · The contract tests

- **1:10** Deeper than a smoke test: the contract tests. No model in the loop, a real Postgres database, and every case from episodes two and three.
- **1:18** Expired and wrong-audience tokens. The audited 403. The flood that leaves the other tenant alone. Tool errors counted in the metrics. And tenant isolation, checked in the database itself, not just in the response.
- **1:33** They run on every commit, and they must all pass. They’re deterministic, so a failure is always a real bug.

## 1:40 · 04 · Golden cases for AI clients

- **1:42** Contract tests can’t tell you whether an AI model uses the tools well. That takes golden cases, like this one.
- **1:49** Add Dana Kim if she’s missing, with seeded data where Dana already exists. So the expected calls are a search, and nothing else. Creating her is forbidden.
- **1:59** The scorer that grades each run has tests of its own: right order passes, create before search fails, a forbidden call fails, one extra search is fine, a second create is not.

## 2:12 · 05 · Running the eval

- **2:13** And this is a real run. Each case goes through a real Claude model, connected to this server like any client, with the database reset to the case’s seeded data.
- **2:24** Every turn’s tool calls are scored on the four checks, and the summary at the bottom is the gate: the weakest model has to reach ninety five percent, or the release is blocked.

## 2:35 · Summary

- **2:36** Click. Script. Test. Evaluate.
- **2:39** From a first 401 to a release gate: that’s how you get to know an MCP server, and how you keep trusting it.
  - _Becky:_ Now I trust it, and I can prove it. 😄
