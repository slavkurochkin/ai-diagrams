# YouTube — Breaking It on Purpose

Generated from `video.mjs` (`youtube` block) on every render; chapters come from the real timeline. Paste as-is.

## Title

Breaking an MCP Server on Purpose: 429s, Bad Input, Cross-Tenant Deletes (Hands-on MCP, Ep. 3)

## Description

```
What happens when an MCP client floods your server, sends garbage, or tries to delete another customer's data?

Becky deliberately misbehaves against a real multi-tenant MCP server, using the MCP Inspector, its command-line mode, and curl, and checks that it fails safely every time.

What you'll learn:
• Per-tenant rate limiting: 429 Too Many Requests, Retry-After, and why the neighbor tenant isn't affected
• Server-side input validation, and why tool errors are normal answers an AI model can learn from
• What happens when a client calls a tool that doesn't exist
• A cross-tenant delete with the exact ID, and why it's indistinguishable from a missing record
• Audit logs and metrics that count 429s and tool errors, the signals an error-rate monitor watches

Chapters
0:00 Intro
0:19 A flood: 429 and Retry-After
0:44 The neighbor doesn’t notice
1:07 Bad arguments: a tool error
1:32 A tool that doesn’t exist
1:56 A delete aimed at another tenant
2:38 The metrics count it all
3:08 Summary
```

## Tags

MCP, Model Context Protocol, MCP Inspector, rate limiting, 429, input validation, multi-tenant, security testing, AI agents, observability, Claude
