# Multi-Tenant MCP Server — transcript

Generated from `video.mjs` on every render. Total 5:04 · voice `af_heart` at 1.0× · template "Multi-Tenant MCP Server".

## 0:00 · Overview

- **0:01** This diagram shows a multi-tenant MCP server.
- **0:04** One MCP server, shared by many clients and many customer organizations.
- **0:10** Every call is authenticated, rate limited, routed, isolated by tenant, and observed.

## 0:16 · Meet Becky

- **0:18** Meet Becky. She’s a sales rep at Acme, and she’s been fighting the CRM all morning.
  - _Becky:_ Ugh. This CRM, again… 😩
- **0:23** So she asks her AI assistant: find Dana Kim at Northwind, and add her if she’s not in the CRM.
  - _Becky:_ Find Dana Kim at Northwind, and add her if she’s not in the CRM.
- **0:30** Let’s follow her request through the server.

## 0:33 · 01 · Clients & endpoint

- **0:35** Becky’s assistant is an MCP client. Requests like hers come from many clients: Claude, ChatGPT, IDEs, and in-house agents.
  - _Becky:_ Find Dana Kim at Northwind, and add her if she’s not in the CRM.
- **0:45** They hit the CRM MCP server over stateless Streamable HTTP, so any instance can serve any request, and the server can scale out horizontally.

## 0:56 · 02 · Where the token comes from

- **0:57** Every call needs an OAuth access token. So where does it come from? Not from this server. The MCP server never creates tokens. It only checks them.
- **1:07** The first time a client connects without a token, the server answers with a 401, and tells it which authorization server to use.
- **1:16** That’s the sign-in prompt Becky sees. She signs in to Acme CRM, and approves access.
  - _Sign-in prompt:_ (on screen)
- **1:22** The authorization server then issues an access token, which carries her organization as an org_id claim, and the scopes she granted, like crm:read.
- **1:32** From then on, the client sends that token with every request.

> **Card — Getting a token**
> - 1 · Client calls without a token → 401, plus where to sign in
> - 2 · Becky signs in at the authorization server (auth.acme.example) and approves access
> - 3 · It issues an access token: org_id + scopes (crm:read, crm:write)
> - 4 · Client sends it on every call: Authorization: Bearer …

## 1:36 · 03 · Authentication

- **1:38** On each call, the OAuth step validates the token: its signature, its issuer, that it was issued for this server, and that it hasn’t expired.
- **1:46** Then it reads the tenant from the org_id claim, never from the tool arguments, so a client can’t ask for another customer’s data.
- **1:55** A missing, expired, or invalid token is rejected with a 401, which goes straight back through the server to the client.

> **Card — Checked on every call**
> - ✓ Signature, using the authorization server’s public keys
> - ✓ Issuer is auth.acme.example
> - ✓ Audience is this server, not some other API
> - ✓ Not expired
> - → Tenant = org_id claim · scopes kept for the tools
> - ✗ Any check fails → 401

## 2:03 · 04 · Per-tenant rate limits

- **2:05** Next come per-tenant rate limits. They sit after OAuth, because you can only count calls per tenant once you know who the tenant is.
- **2:13** 120 calls a minute, with a burst of 20.
- **2:16** One noisy customer can’t starve everyone else. Throttled calls get a 429.

## 2:23 · 05 · Tool routing

- **2:24** The tool router dispatches each call by tool name to one of three exposed tools.
- **2:29** Unknown tools fall through to the default branch, and get an error back through the server.

## 2:35 · 06 · Exposed tools

- **2:36** Each tool declares an input schema, the OAuth scope it needs, and safety hints.
- **2:41** search_contacts needs crm:read, and is marked read-only.

## 2:46 · 06 · Exposed tools

- **2:47** create_contact needs crm:write. A token without that scope gets a 403. Its description also tells the model to search first, to avoid duplicates. Which is exactly what Becky asked for.

## 3:02 · 06 · Exposed tools

- **3:03** delete_contact is also marked destructive, so well-behaved clients ask the user before calling it.
- **3:10** But hints are only hints. The real protection is the crm:write scope, which the server enforces.

## 3:17 · 07 · Tenant-isolated data

- **3:18** All three tools read and write the CRM database: Postgres with row-level security on tenant_id.
- **3:26** Even a buggy tool can’t read another tenant’s rows.

## 3:30 · 08 · Results

- **3:31** Results flow back to the server, which returns them to the client as JSON. Every error takes the same path.

## 3:38 · Back to Becky

- **3:40** Back to Becky. The results reach her assistant, and it replies: Dana wasn’t in the CRM, so I added her.
  - _Assistant:_ Dana Kim wasn’t in the CRM, so I added her. ✓
- **3:47** One search, one create, her tenant checked at every step, and Becky never had to think about any of it.
  - _Becky:_ Wait, that’s it? That was easy! 🎉

## 3:53 · 09 · Audit log

- **3:55** Every write is audited.
- **3:57** Every create and delete attempt, including scope denials, records the tenant, client, tool, arguments, and result.

## 4:04 · 10 · Tracing

- **4:06** Finally, operations. Tracing records every step of every call, across the whole flow, with personal data redacted.

## 4:14 · 11 · Error-rate monitor

- **4:15** The error-rate monitor watches every response the server sends back, for all tenants.
- **4:21** It divides failed responses by all responses, over a rolling five-minute window.
- **4:26** Failures include auth rejections, rate-limit hits, unknown tools, and tools that fail, for example when the database is down.
- **4:34** If more than 2 percent of responses fail, it pages on-call.
- **4:38** The type of error points to the cause. A spike of 401s often means a broken token rollout. A wall of 429s, a runaway client. And tool errors, a failing backend.

> **Card — What the monitor watches**
> - Every response the server sends back, across all tenants
> - Error rate = failed ÷ all responses, rolling 5 minutes
> - Counts as failed: 401 / 403 auth · 429 rate limit · unknown tool · tool errors
> - Above 2% → page on-call
> - Spike of 401s → broken token rollout · 429s → runaway client · tool errors → failing backend

## 4:52 · Summary

- **4:53** Authenticate. Limit. Route. Isolate. Audit. Observe.
- **4:57** That’s how one MCP server safely serves many clients and many tenants.
  - _Becky:_ Thanks! 😄
