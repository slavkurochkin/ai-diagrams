# YouTube — Meet the MCP Inspector

Generated from `video.mjs` (`youtube` block) on every render; chapters come from the real timeline. Paste as-is.

## Title

MCP Inspector Tutorial: Connect to a Real Multi-Tenant MCP Server (Hands-on MCP, Ep. 1)

## Description

```
What does it actually look like to connect to a real MCP server, one that rejects you without a token?

Becky has seen the architecture diagrams. Now she opens the MCP Inspector against a running multi-tenant MCP server and tries it herself.

What you'll learn:
• Adding a Streamable HTTP server to the MCP Inspector
• Why the first connection fails with 401, and how the Inspector discovers the authorization server (protected resource metadata)
• Getting an access token and reading its claims: tenant, scopes, audience, expiry
• Sending it as an Authorization header, and the MCP handshake: initialize, initialized, tools/list
• Reading tool descriptions, input schemas, and hints (read-only, destructive)
• First tool calls, and why another tenant's data simply doesn't exist

Chapters
0:00 Intro
0:13 Becky wants to see it work
0:38 Add the server
0:59 The first try: 401
1:31 Getting a token
2:04 Adding the Authorization header
2:20 Connected: the handshake
2:48 What the tools tell a model
3:16 First calls, and the Dana Kim puzzle
3:39 Summary
```

## Tags

MCP, Model Context Protocol, MCP Inspector, MCP server, OAuth, access token, JWT, multi-tenant, AI agents, tutorial, Claude
