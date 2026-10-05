# Tokens and Tenants, Live — transcript

Generated from `video.mjs` on every render. Total 3:53 · voice `af_heart` at 1.0× · template "MCP Inspector + acme-crm-mcp demo server".

## 0:00 · Intro

- **0:01** Hands-on MCP, episode two: tokens and tenants, live.
- **0:05** Same server, same tools, different tokens. Let’s see how different the world looks.

## 0:11 · Where’s Dana?

- **0:12** Last time, Becky searched for Dana Kim with Acme’s token, and got zero matches.
- **0:18** But Dana does exist. She’s a contact of Globex, another company on the same server. To test isolation, Becky’s team registered a test client for Globex, too.
  - _Becky:_ She’s in the system. I’ve seen her! 🤔

## 0:29 · 01 · A Globex token

- **0:30** Becky asks the authorization server for a Globex token.
- **0:34** Decoded, it’s the same shape as before: same server, same scopes. Only the org ID differs. Globex.

> **Card — Same server, another tenant**
> - Client globex-agent, registered for Globex
> - org_id: globex → a different tenant
> - Same audience, same scopes, same server

## 0:42 · 02 · Switching tenants

- **0:44** She swaps the Authorization header for the Globex token. Headers are sent from the next connection on, so she disconnects, and connects again.
- **0:52** Same tool, same query: Dana.
  - _Becky:_ There she is! 😮
- **0:55** There she is. Dana Kim, contact c 201, at Northwind. Same server, same tool, same question. The token decides which world you see.

## 1:05 · 03 · Isolation lives in the database

- **1:06** Where does that isolation come from? Becky looks in the database. As the owner, she sees one contacts table, holding both tenants.
- **1:15** But the server never connects as the owner. It connects as app user. And app user, with no tenant set, sees nothing at all. Zero rows.
- **1:24** On every call, the server sets the tenant from the token’s org ID, inside the transaction. Now app user sees Acme’s contacts, and only Acme’s.
- **1:34** That’s row-level security. The filter lives in Postgres, so even a buggy query can’t cross tenants.
  - _Becky:_ So even a bug can’t leak it. Nice. 😌

> **Card — Row-level security**
> - One table, every tenant’s rows
> - The app connects as app_user, not the owner
> - No tenant set → 0 rows
> - Per call: app.tenant_id = the token’s org_id → only that tenant’s rows
> - Even a buggy query can’t cross tenants

## 1:41 · 04 · A read-only token

- **1:42** Next, scopes. Becky’s team also registered a read-only client for Acme: it may read contacts, never change them.
- **1:50** She switches the Inspector to the read-only token, and reconnects.
- **1:54** Headers are sent from the next connection on, so she disconnects, and connects again, now as the read-only client.

## 2:02 · 04 · A read-only token

- **2:03** Now a write. Create contact, Dana Kim, execute. Tool call failed.
  - _Becky:_ Tool Call Failed… with an auth error? 🤨
- **2:08** The network log shows what really happened. The server answered 403: valid token, wrong scope. Create contact needs C R M write.
- **2:18** A 403 like this also tells the client which scope is missing, so the Inspector tried to get a better token, called step-up authorization. This demo’s authorization server has no sign-in page, so that attempt fails, and that’s the error on screen.

> **Card — What happened**
> - Server: 403, insufficient_scope, needs crm:write
> - The Inspector tries step-up: get a better token from the authorization server
> - No sign-in endpoint here, so that fails: the error you see is about the auth server

## 2:34 · 05 · The server’s answer, and the audit log

- **2:35** Becky sends the same call herself with curl. 403 Forbidden. The WWW-Authenticate header says exactly what’s wrong: insufficient scope, and the scope needed: C R M write.
- **2:49** Compare that with 401. 401 means: who are you? 403 means: I know who you are, and you’re not allowed to do this.
- **2:57** And the attempt didn’t vanish. The audit log has both denied writes: tenant, client, tool, outcome, and why. Every write attempt is recorded, including the ones that fail.

## 3:08 · 06 · Bad tokens

- **3:10** Last test: bad tokens. These are test-only tokens, minted locally with the demo signing key. First, one that expired an hour ago.
- **3:19** 401, invalid token: the expiry check failed. A stolen token is only useful until it expires.
- **3:27** Next, a perfectly valid token, issued for a different server.
- **3:31** Also 401: unexpected audience. A token meant for another API can’t be replayed here, even though the signature is genuine.

## 3:40 · Summary

- **3:42** Tenant. Scope. Audit. Expiry.
- **3:44** Next time, Becky breaks things on purpose: rate limits, bad arguments, and a delete aimed at another tenant.
  - _Becky:_ Next: let’s break it! 😈
