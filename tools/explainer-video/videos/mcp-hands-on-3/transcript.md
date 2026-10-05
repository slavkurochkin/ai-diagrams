# Breaking It on Purpose — transcript

Generated from `video.mjs` on every render. Total 3:21 · voice `af_heart` at 1.0× · template "MCP Inspector + acme-crm-mcp demo server".

## 0:00 · Intro

- **0:01** Hands-on MCP, episode three: breaking it on purpose.
- **0:05** A server that only works when everyone behaves isn’t ready for production. Let’s misbehave.

## 0:11 · Time to break things

- **0:13** Becky has seen the server behave. Now she wants to see how it misbehaves, and whether it fails safely.
  - _Becky:_ Let’s break it! 😈

## 0:19 · 01 · A flood

- **0:21** First, a flood. Becky fires twenty-six calls in a row with Acme’s token.
- **0:26** The first ones go through. Then Acme’s burst allowance runs out, and every call after that gets 429: too many requests.
- **0:34** Each 429 says when to come back. Retry-After: the seconds until the bucket has room again. A well-behaved client waits that long.

> **Card — A token bucket, per tenant**
> - 120 calls a minute, bursts of up to 20
> - Bucket empty → 429 Too Many Requests
> - Retry-After: seconds until there’s room again
> - Refills at 2 calls a second

## 0:44 · 02 · The neighbor doesn’t notice

- **0:45** Becky floods as Acme again, and right after, makes one call as Globex, the other tenant.
- **0:51** Acme: 429, 429, 429. Globex: 200. The flood stays inside Acme’s own bucket.
- **1:00** That’s why the limit comes after authentication: the server needs the tenant to know whose bucket to use.

> **Card — Why Globex is fine**
> - Buckets are keyed by tenant, taken from the token
> - Acme’s flood → only Acme’s 429s
> - In memory, per instance. With several instances, keep buckets in a shared store like Redis

## 1:07 · 03 · Bad arguments

- **1:08** Next, bad input. Create contact, Dana Kim, with an email address that isn’t one.
- **1:14** The server’s input schema rejects it: invalid email address. Nothing reaches the database.
- **1:20** And notice the protocol log says OK. A tool error is a normal answer, not a broken request, so an AI model can read the message, and correct its own mistake.

> **Card — Validation, on the server**
> - The input schema says email must be an email
> - Rejected before any code or database runs
> - A tool error: a normal answer (the log says OK) the model can read and fix

## 1:32 · 04 · A tool that doesn’t exist

- **1:33** What about a tool that doesn’t exist? The Inspector’s command-line mode makes that easy to try.
- **1:39** It refuses: drop all tables isn’t on this server, exit code five. Asked directly, the server says the same: a tool error, tool not found.
- **1:49** Only the three tools the server registered can ever run. Whatever a model invents, the server just says no.

> **Card — Unknown tools**
> - Inspector CLI: “not found on server”, exit code 5
> - Server: tool error, Tool drop_all_tables not found
> - Only registered tools can ever run

## 1:56 · 05 · A delete aimed at another tenant

- **1:57** Now the nasty one. With Acme’s token, Becky tries to delete contact c 201: Dana Kim, who belongs to Globex. She even knows the exact ID.
- **2:08** No contact with that ID. To Acme, Globex’s row simply doesn’t exist, so it can’t be deleted.
- **2:15** And the answer is exactly what you’d get for an ID that truly doesn’t exist, so an attacker can’t even learn which IDs are real.
- **2:23** Dana is untouched, and the attempt is in the audit log.

> **Card — Deleting Globex’s Dana, as Acme**
> - To Acme, row c_201 doesn’t exist (row-level security)
> - Same answer as a truly missing id: no way to probe which ids exist
> - Dana untouched, and the attempt is audited

## 2:27 · 05 · A delete aimed at another tenant

- **2:28** In the database: c 201 is still there, still Globex’s. And the audit log has Acme’s failed delete, with the ID it aimed at.

## 2:38 · 06 · Counting it all

- **2:39** Finally, the server’s metrics. Every response is counted, per tenant and outcome.
- **2:45** There are Acme’s 429s from the floods, and its two tool errors: the bad email, and the failed delete. Globex has one tool error: the made-up tool, which Becky called with Globex’s token.
- **2:57** This is what the error-rate monitor watches. A spike of 429s points to a runaway client. A spike of tool errors, to a model misusing a tool.

> **Card — What the error-rate monitor sees**
> - Every response, per tenant and outcome
> - Acme: 429s from the floods, tool_errors: the bad email and the failed delete
> - Globex: one tool_error, the made-up tool, called with its token
> - 429 spike → a runaway client · tool errors → a model misusing a tool

## 3:08 · Summary

- **3:09** Throttle. Validate. Refuse. Isolate. Count.
- **3:12** Next time: from clicking to automation. The Inspector’s command line, contract tests, and evals.
  - _Becky:_ It failed safely every time. 😎
