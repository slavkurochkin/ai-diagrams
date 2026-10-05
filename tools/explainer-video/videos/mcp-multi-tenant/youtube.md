# YouTube — Multi-Tenant MCP Server

Generated from `video.mjs` (`youtube` block) on every render; chapters come from the real timeline. Paste as-is.

## Title

How a Multi-Tenant MCP Server Works: OAuth, Rate Limits, Tool Routing & Tenant Isolation

## Description

```
One MCP server, shared by many AI clients and many customer organizations. How do you keep every tenant's data separate, every call authenticated, and every write accountable?

Follow Becky, a sales rep, as her AI assistant's request travels through a production-style multi-tenant MCP server, from her question to the CRM and back.

What you'll learn:
• Where the OAuth token actually comes from (hint: not from the MCP server) and what gets checked on every call
• Why the tenant comes from the token's org_id claim, never from tool arguments
• Per-tenant rate limits, and why they sit after authentication
• Tool routing, scopes, and why readOnly/destructive hints are only hints
• Tenant isolation with Postgres row-level security
• Audit logs for every write attempt, tracing, and an error-rate monitor that sees every failure

Chapters
0:00 Intro
0:16 Meet Becky
0:33 Clients & endpoint
0:56 Where the token comes from
1:36 Authentication
2:03 Per-tenant rate limits
2:23 Tool routing
2:35 Exposed tools
3:17 Tenant-isolated data
3:30 Results & back to Becky
3:53 Audit log
4:04 Tracing & error-rate monitor
4:52 Summary
```

## Tags

MCP, Model Context Protocol, MCP server, multi-tenant, OAuth, AI agents, LLM, AI architecture, rate limiting, row-level security, Claude
