# Meet the MCP Inspector — transcript

Generated from `video.mjs` on every render. Total 3:51 · voice `af_heart` at 1.0× · template "MCP Inspector + acme-crm-mcp demo server".

## 0:00 · Intro

- **0:01** Hands-on MCP, episode one: meet the MCP Inspector.
- **0:06** In earlier videos we drew a multi-tenant MCP server. Now it’s real, and running on this machine.

## 0:13 · Becky wants to see it work

- **0:14** Becky has seen the diagrams. Now she wants to see the real thing work.
  - _Becky:_ Diagrams are nice… but does it actually work? 🤨
- **0:19** Her team gave her the Acme CRM server, running locally: an authorization server that issues tokens, and the MCP server itself.
- **0:28** And the MCP Inspector, the official tool for poking at MCP servers. It runs in the browser, protected by its own local token.

## 0:38 · 01 · Add the server

- **0:39** First, Becky adds the server. Add servers, then add manually.
- **0:44** She gives it a name, acme CRM, and picks the transport: streamable HTTP, the way remote MCP servers talk.
- **0:52** Then the server’s address: localhost, port 8787, slash MCP.

> **Card — Adding a server**
> - ID: just a local name
> - Transport: streamable-http for remote servers (stdio is for local processes)
> - URL: the one endpoint every MCP request goes to

## 0:59 · 02 · The first try

- **1:01** Becky flips the switch to connect, and it fails.
  - _Becky:_ Failed?! 😤
- **1:04** That’s not a bug. The server answered 401: no token, no entry.
- **1:09** And look at the network log. After the 401, the Inspector followed the server’s hint to its protected resource metadata, and from there found the authorization server.
- **1:19** The Inspector wanted to sign Becky in there, but found no sign-in endpoint. This demo’s token service only issues tokens to registered clients. So Becky gets one herself.

> **Card — What just happened**
> - POST /mcp → 401, plus a hint: resource_metadata
> - GET :8787/.well-known/oauth-protected-resource → “tokens come from :8788”
> - GET :8788/.well-known/oauth-authorization-server → how to get one
> - No authorization_endpoint → no browser sign-in: this demo’s service only serves registered clients

## 1:31 · 03 · Getting a token

- **1:32** The authorization server hands out tokens to registered clients. Becky’s team registered one for her: acme agent.
- **1:40** One command, and she has an access token.
- **1:43** Decode it, and you can read the claims inside. Org ID acme: that’s her tenant. Her scopes: read and write. The audience: this exact server. And it expires in an hour.
- **1:54** Anyone can read a token. What matters is the signature: the server checks it, plus issuer, audience and expiry, on every single call.

> **Card — Inside the token**
> - org_id: acme → the tenant
> - scope: crm:read crm:write
> - aud: this exact server, nothing else
> - Checked on every call: signature, issuer, audience, expiry

## 2:04 · 04 · Adding the header

- **2:05** Back in the Inspector, she opens the server’s settings, and finds custom headers.
- **2:10** One header: Authorization, then Bearer, then the token.
- **2:13** That’s exactly how any MCP client presents its token: the same header, on every request.

## 2:20 · 05 · Connected

- **2:22** Now she connects again. Connected.
  - _Becky:_ Connected! 🎉
- **2:24** The protocol log shows the handshake. Initialize: client and server agree on a protocol version and capabilities. Then initialized. Then the first real question: tools list.
- **2:36** One more detail: the Inspector also asks for a notification stream, and gets 405. This server is stateless on purpose, so any instance can answer any request.

> **Card — The handshake**
> - initialize → protocol version and capabilities
> - notifications/initialized → ready
> - tools/list → what can this server do?
> - A GET for a notification stream gets 405: this server is stateless, by design

## 2:48 · 06 · The tools

- **2:49** In the tools tab, the Inspector lists everything the server offers: exactly what an AI model would see.
- **2:56** Search contacts is marked read-only. Its description tells models to search before creating. And it has one required field: the query.
- **3:06** Delete contact is marked destructive, and its description says to confirm with the user first. Hints like these are how clients decide when to ask before acting.

> **Card — What a model sees**
> - Name and title
> - A description: when to use it, not just what it does
> - An input schema: query, required
> - Hints: read-only, destructive, idempotent

## 3:16 · 07 · First calls

- **3:18** Time for a real call. Search contacts, query Priya, execute.
- **3:22** Priya Shah, from Initech, straight out of Acme’s database.
- **3:26** Now Becky searches for Dana Kim, whom she knows is in the system.
- **3:30** Zero matches. Dana belongs to Globex, a different tenant. With Acme’s token, Globex’s data simply doesn’t exist.
  - _Becky:_ Wait… where’s Dana? 🤔

## 3:39 · Summary

- **3:40** Connect. Authenticate. Discover. Call.
- **3:43** Next time, Becky switches tokens, and sees tenant isolation, scopes, and the audit log in action.
  - _Becky:_ See you in episode 2! 👋
