# A Real AI Client — transcript

Generated from `video.mjs` on every render. Total 2:12 · voice `af_heart` at 1.0× · template "acme-crm-mcp demo server + a Claude-powered MCP client".

## 0:00 · Intro

- **0:01** Hands-on MCP, episode five: a real AI client.
- **0:05** Becky has tested the server every way she could. Now it’s time to hand it to an AI.

## 0:11 · Full circle

- **0:12** In the very first video, Becky asked her assistant: add Dana Kim, if she’s not in the CRM. Today, that request runs for real.
  - _Becky:_ My actual assistant, on the real server! 🤩
- **0:21** The AI client is small. It gets a token from the authorization server, like the Inspector did, and connects over MCP with it.
- **0:30** It hands the server’s tools to Claude. Whenever Claude asks for a tool call, the client runs it on the server, and sends the result back.

> **Card — How an AI client connects**
> - Token from the authorization server, as client acme-agent
> - MCP connection with Authorization: Bearer …
> - tools/list → the tools Claude may use, with their descriptions
> - Claude asks for a call → the client runs it over MCP → the result goes back

## 0:39 · 01 · Add Dana, if she’s missing

- **0:41** Becky’s request goes to Claude, exactly as she’d type it.
- **0:44** Watch the order of the calls. Claude searches first. Acme has no Dana Kim, because the Dana we saw belongs to Globex, and Acme’s token can’t see her.
- **0:55** Only after the searches come up empty does it create her, once. That’s the order the tool descriptions asked for.

## 1:02 · 02 · The same request, again

- **1:03** Now the same request again. This time, Dana is already in Acme’s CRM.
- **1:09** Claude searches, finds her, and stops. No second Dana, no duplicate. It’s the same request with different data, the case the golden tests were built for.

## 1:19 · 03 · A destructive request

- **1:20** Then a dangerous one: delete Dana Kim. The delete tool is marked destructive, and its description says to confirm with the user first.
- **1:29** Claude finds her, and asks before doing anything permanent.
- **1:33** Only after Becky says yes does it delete, by her exact ID.

## 1:38 · 04 · Checking the AI’s work

- **1:39** Every write the AI made is in the audit log: the create, and the delete, with their arguments, under Acme’s client.
- **1:46** And Globex’s Dana Kim is exactly where she was. The AI worked only inside Acme’s data, because that’s all its token could ever see.

## 1:56 · Summary

- **1:57** Search first. Ask before deleting. Stay in your tenant. Audit everything.
- **2:02** That’s an MCP server an AI can use safely, and the end of Becky’s journey: from a diagram, to a real assistant.
  - _Becky:_ From a diagram to my real assistant. 🎉
