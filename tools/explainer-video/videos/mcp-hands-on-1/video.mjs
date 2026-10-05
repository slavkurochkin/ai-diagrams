// Scenario: Hands-on MCP, episode 1: Meet the MCP Inspector. Rendered with app.mjs (real UI, real terminal).
// Story: after the diagram videos, Becky wants to see the real server work. She adds it to the MCP Inspector,
// hits a 401 (and watches the Inspector discover the authorization server), gets a token, adds the header,
// connects, explores the tools, and makes her first calls, ending with the Dana Kim puzzle that sets up ep. 2.
// History and feedback: LOG.md. Scene keys: see the header of ../../app.mjs and ../mcp-multi-tenant/video.mjs.

const scenes = [
  {
    chip: 'Intro',
    title: true,
    lines: [
      'Hands-on MCP, episode one: meet the MCP Inspector.',
      'In earlier videos we drew a multi-tenant MCP server. Now it’s real, and running on this machine.',
    ],
  },
  {
    chip: 'Becky wants to see it work',
    chapter: 'Becky wants to see it work',
    terminal: { pos: 'full' },
    char: {
      moods: [{ line: 0, mood: 'curious' }],
      pops: [{ line: 0, delay: 0.5, kind: 'say', text: 'Diagrams are nice… but does it actually work? 🤨' }],
    },
    do: [
      { line: 1, delay: 0.4, act: 'run', display: 'npm run dev', outputOf: 'server' },
      { line: 2, delay: 0.6, act: 'run', display: 'npx @modelcontextprotocol/inspector', outputOf: 'inspector' },
    ],
    lines: [
      'Becky has seen the diagrams. Now she wants to see the real thing work.',
      'Her team gave her the Acme CRM server, running locally: an authorization server that issues tokens, and the MCP server itself.',
      'And the MCP Inspector, the official tool for poking at MCP servers. It runs in the browser, protected by its own local token.',
    ],
  },
  {
    chip: '01 · Add the server',
    chapter: 'Add the server',
    cardFrom: 1,
    cardPos: 'bottomleft',
    card: {
      title: 'Adding a server',
      items: [
        { line: 1, text: '<b>ID:</b> just a local name' },
        { line: 1, text: '<b>Transport:</b> <code>streamable-http</code> for remote servers (stdio is for local processes)' },
        { line: 2, text: '<b>URL:</b> the one endpoint every MCP request goes to' },
      ],
    },
    do: [
      { line: 0, delay: 1.0, act: 'click', target: 'text=Add Servers' },
      { line: 0, delay: 2.4, act: 'click', target: 'text=+ Add manually' },
      { line: 1, delay: 0.3, act: 'type', target: 'label=Server ID *', text: 'acme-crm' },
      { line: 1, delay: 2.4, act: 'click', target: 'role=["textbox",{"name":"Transport"}]' },
      { line: 1, delay: 3.4, act: 'click', target: 'role=["option",{"name":"streamable-http"}]' },
      { line: 2, delay: 0.3, act: 'type', target: 'label=URL *', text: 'http://localhost:8787/mcp' },
      { line: 2, delay: 3.0, act: 'click', target: 'role=["button",{"name":"Add","exact":true}]' },
    ],
    lines: [
      'First, Becky adds the server. Add servers, then add manually.',
      'She gives it a name, acme CRM, and picks the transport: streamable HTTP, the way remote MCP servers talk.',
      'Then the server’s address: localhost, port 8787, slash MCP.',
    ],
  },
  {
    chip: '02 · The first try',
    chapter: 'The first try: 401',
    cardPos: 'bottomleft',
    card: {
      title: 'What just happened',
      items: [
        { line: 1, text: '<code>POST /mcp</code> → <b>401</b>, plus a hint: <code>resource_metadata</code>' },
        { line: 2, text: '<code>GET :8787/.well-known/oauth-protected-resource</code> → “tokens come from :8788”' },
        { line: 2, text: '<code>GET :8788/.well-known/oauth-authorization-server</code> → how to get one' },
        { line: 3, text: 'No <code>authorization_endpoint</code> → no browser sign-in: this demo’s service only serves registered clients' },
      ],
    },
    char: {
      moods: [{ line: 0, delay: 1.6, mood: 'frustrated' }, { line: 2, mood: 'curious' }],
      pops: [{ line: 0, delay: 1.8, kind: 'say', text: 'Failed?! 😤' }],
    },
    do: [
      { line: 0, delay: 0.8, act: 'click', target: 'switch=acme-crm' },
    ],
    highlight: [
      { line: 0, delay: 1.6, until: 1, target: 'text=Failed', label: 'Failed' },
      { line: 0, delay: 2.0, until: 2, target: '.mantine-Notification-root', label: 'the error: no sign-in endpoint' },
      { line: 1, until: 2, target: '.mantine-Badge-root:has-text("401")', label: '401: no token' },
      { line: 2, until: 3, target: ':text("oauth-protected-resource")', label: 'discovery' },
    ],
    lines: [
      'Becky flips the switch to connect, and it fails.',
      'That’s not a bug. The server answered 401: no token, no entry.',
      'And look at the network log. After the 401, the Inspector followed the server’s hint to its protected resource metadata, and from there found the authorization server.',
      'The Inspector wanted to sign Becky in there, but found no sign-in endpoint. This demo’s token service only issues tokens to registered clients. So Becky gets one herself.',
    ],
  },
  {
    chip: '03 · Getting a token',
    chapter: 'Getting a token',
    terminal: { pos: 'right' },
    cardPos: 'bottomleft',
    card: {
      title: 'Inside the token',
      items: [
        { line: 2, text: '<code>org_id: acme</code> → the tenant' },
        { line: 2, text: '<code>scope: crm:read crm:write</code>' },
        { line: 2, text: '<code>aud</code>: this exact server, nothing else' },
        { line: 3, text: 'Checked on every call: signature, issuer, audience, expiry' },
      ],
    },
    do: [
      { line: 0, delay: 0.2, act: 'clear' },
      { line: 1, delay: 0.2, act: 'run', cmd: 'npm run -s token', display: 'export TOKEN=$(npm run -s token)', saveAs: 'TOKEN', quiet: true },
      { line: 2, delay: 0.2, act: 'run', cmd: 'npm run -s decode -- {{TOKEN}}', display: 'npm run decode -- $TOKEN' },
    ],
    lines: [
      'The authorization server hands out tokens to registered clients. Becky’s team registered one for her: acme agent.',
      'One command, and she has an access token.',
      'Decode it, and you can read the claims inside. Org ID acme: that’s her tenant. Her scopes: read and write. The audience: this exact server. And it expires in an hour.',
      'Anyone can read a token. What matters is the signature: the server checks it, plus issuer, audience and expiry, on every single call.',
    ],
  },
  {
    chip: '04 · Adding the header',
    chapter: 'Adding the Authorization header',
    do: [
      { line: 0, delay: 0.8, act: 'click', target: 'text=Settings' },
      { line: 0, delay: 2.2, act: 'click', target: 'text=Options' },
      { line: 0, delay: 3.0, act: 'click', target: 'text=Custom Headers' },
      { line: 1, delay: 0.2, act: 'click', target: 'text=+ Add Header' },
      { line: 1, delay: 1.0, act: 'type', target: 'placeholder=Key', text: 'Authorization' },
      { line: 1, delay: 2.6, act: 'paste', target: 'placeholder=Value', text: 'Bearer {{TOKEN}}' },
      { line: 2, delay: 3.6, act: 'click', target: 'role=["button",{"name":"Close","exact":true}]' },
    ],
    highlight: [{ line: 2, until: 3, target: 'placeholder=Value', label: 'Authorization: Bearer …' }],
    lines: [
      'Back in the Inspector, she opens the server’s settings, and finds custom headers.',
      'One header: Authorization, then Bearer, then the token.',
      'That’s exactly how any MCP client presents its token: the same header, on every request.',
    ],
  },
  {
    chip: '05 · Connected',
    chapter: 'Connected: the handshake',
    cardPos: 'bottomleft',
    card: {
      title: 'The handshake',
      items: [
        { line: 1, text: '<code>initialize</code> → protocol version and capabilities' },
        { line: 1, text: '<code>notifications/initialized</code> → ready' },
        { line: 1, text: '<code>tools/list</code> → what can this server do?' },
        { line: 2, text: 'A GET for a notification stream gets <b>405</b>: this server is stateless, by design' },
      ],
    },
    char: {
      moods: [{ line: 0, delay: 1.6, mood: 'happy' }],
      pops: [{ line: 0, delay: 1.8, kind: 'say', text: 'Connected! 🎉' }],
    },
    do: [{ line: 0, delay: 0.6, act: 'click', target: 'switch=acme-crm' }],
    highlight: [
      { line: 0, delay: 1.5, until: 1, target: 'text=Connected', label: 'Connected' },
      { line: 1, target: '.mantine-Badge-root:text-is("initialize")', label: 'handshake' },
    ],
    lines: [
      'Now she connects again. Connected.',
      'The protocol log shows the handshake. Initialize: client and server agree on a protocol version and capabilities. Then initialized. Then the first real question: tools list.',
      'One more detail: the Inspector also asks for a notification stream, and gets 405. This server is stateless on purpose, so any instance can answer any request.',
    ],
  },
  {
    chip: '06 · The tools',
    chapter: 'What the tools tell a model',
    card: {
      title: 'What a model sees',
      items: [
        { line: 0, text: 'Name and title' },
        { line: 1, text: 'A description: <i>when</i> to use it, not just what it does' },
        { line: 1, text: 'An input schema: <code>query</code>, required' },
        { line: 2, text: 'Hints: <code>read-only</code>, <code>destructive</code>, <code>idempotent</code>' },
      ],
    },
    char: { moods: [{ line: 0, mood: 'curious' }] },
    do: [
      { line: 0, delay: 0.6, act: 'click', target: 'text=Tools' },
      { line: 1, delay: 0.2, act: 'click', target: 'text=Search contacts' },
      { line: 2, delay: 0.3, act: 'click', target: 'text=Delete contact' },
    ],
    highlight: [
      { line: 1, delay: 1.0, until: 2, target: 'text=read-only', label: 'hint' },
      { line: 2, delay: 1.0, target: 'text=destructive', label: 'hint' },
    ],
    lines: [
      'In the tools tab, the Inspector lists everything the server offers: exactly what an AI model would see.',
      'Search contacts is marked read-only. Its description tells models to search before creating. And it has one required field: the query.',
      'Delete contact is marked destructive, and its description says to confirm with the user first. Hints like these are how clients decide when to ask before acting.',
    ],
  },
  {
    chip: '07 · First calls',
    chapter: 'First calls, and the Dana Kim puzzle',
    char: {
      moods: [{ line: 1, mood: 'happy' }, { line: 3, delay: 1.2, mood: 'curious' }],
      pops: [{ line: 3, delay: 1.4, kind: 'say', text: 'Wait… where’s Dana? 🤔' }],
    },
    do: [
      { line: 0, delay: 0.4, act: 'click', target: 'text=Search contacts' },
      { line: 0, delay: 1.4, act: 'type', target: 'label=query *', text: 'Priya' },
      { line: 0, delay: 3.0, act: 'click', target: 'text=Execute Tool' },
      { line: 2, delay: 0.4, act: 'click', target: 'role=["button",{"name":"Close results"}]' },
      { line: 2, delay: 1.6, act: 'type', target: 'label=query *', text: 'Dana' },
      { line: 2, delay: 3.2, act: 'click', target: 'text=Execute Tool' },
    ],
    highlight: [
      { line: 1, until: 2, target: 'text=Results', label: 'Priya Shah, Initech' },
      { line: 3, target: 'text=Results', label: '0 matches' },
    ],
    lines: [
      'Time for a real call. Search contacts, query Priya, execute.',
      'Priya Shah, from Initech, straight out of Acme’s database.',
      'Now Becky searches for Dana Kim, whom she knows is in the system.',
      'Zero matches. Dana belongs to Globex, a different tenant. With Acme’s token, Globex’s data simply doesn’t exist.',
    ],
  },
  {
    chip: 'Summary',
    summary: true,
    char: { moods: [{ line: 0, mood: 'happy' }], pops: [{ line: 1, delay: 0.5, kind: 'say', text: 'See you in episode 2! 👋' }] },
    lines: [
      'Connect. Authenticate. Discover. Call.',
      'Next time, Becky switches tokens, and sees tenant isolation, scopes, and the audit log in action.',
    ],
  },
];

export default {
  renderer: 'app',
  template: 'MCP Inspector + acme-crm-mcp demo server',
  title: { kicker: 'Hands-on MCP · Episode 1', heading: 'Meet the MCP Inspector', sub: 'Poking a real multi-tenant MCP server, no code required' },
  summary: ['Connect', 'Authenticate', 'Discover', 'Call'],
  character: { label: 'Becky', startMood: 'curious', look: { tag: 'Becky · trying it herself' } },
  setup: { servers: {} },
  // long tokens are shown shortened in the terminal; the real value is still what gets pasted
  displayOutput: (out) => out.replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, (t) => `${t.slice(0, 28)}…${t.slice(-8)}  (${t.length} chars)`),
  speak: [[/\bMCP\b/g, 'M C P'], [/\b401\b/g, 'four oh one'], [/\b405\b/g, 'four oh five'], [/\bCRM\b/g, 'C R M'], [/org_id/g, 'org I D'], [/\bID\b/g, 'I D']],
  youtube: {
    title: 'MCP Inspector Tutorial: Connect to a Real Multi-Tenant MCP Server (Hands-on MCP, Ep. 1)',
    description: `
What does it actually look like to connect to a real MCP server, one that rejects you without a token?

Becky has seen the architecture diagrams. Now she opens the MCP Inspector against a running multi-tenant MCP server and tries it herself.

What you'll learn:
• Adding a Streamable HTTP server to the MCP Inspector
• Why the first connection fails with 401, and how the Inspector discovers the authorization server (protected resource metadata)
• Getting an access token and reading its claims: tenant, scopes, audience, expiry
• Sending it as an Authorization header, and the MCP handshake: initialize, initialized, tools/list
• Reading tool descriptions, input schemas, and hints (read-only, destructive)
• First tool calls, and why another tenant's data simply doesn't exist`,
    tags: ['MCP', 'Model Context Protocol', 'MCP Inspector', 'MCP server', 'OAuth', 'access token', 'JWT', 'multi-tenant', 'AI agents', 'tutorial', 'Claude'],
  },
  scenes,
};
