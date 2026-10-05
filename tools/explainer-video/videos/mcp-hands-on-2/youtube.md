# YouTube — Tokens and Tenants, Live

Generated from `video.mjs` (`youtube` block) on every render; chapters come from the real timeline. Paste as-is.

## Title

MCP Server Security, Live: Tenants, Scopes, 403s, and Bad Tokens (Hands-on MCP, Ep. 2)

## Description

```
Same MCP server, same tool, same question, so why does one token find Dana Kim and another doesn't?

Becky continues exploring a real multi-tenant MCP server with the MCP Inspector: she switches tenants, looks inside the database, and tries tokens that should fail.

What you'll learn:
• Switching tenants by switching tokens, and seeing different data from the same tool
• Where tenant isolation really lives: Postgres row-level security, and why the app never connects as the owner
• What a read-only token gets on a write: 403 insufficient_scope, and how MCP clients try step-up authorization
• 401 vs 403, and the WWW-Authenticate header that explains each
• An audit log that records denied write attempts, not just successful ones
• Why expired and wrong-audience tokens are rejected even with a genuine signature

Chapters
0:00 Intro
0:11 Where’s Dana?
0:29 A token for another tenant
0:42 Switching tenants
1:05 Isolation lives in the database
1:41 A read-only token tries to write
2:34 The server’s answer, and the audit log
3:08 Expired and wrong-audience tokens
3:40 Summary
```

## Tags

MCP, Model Context Protocol, MCP Inspector, OAuth, scopes, 403, row-level security, multi-tenant, audit log, JWT, Claude
