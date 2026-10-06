// Scenario: Multi-Tenant MCP Server explainer.
// Story: Becky, a sales rep at Acme, asks her AI assistant to find a contact and add it if missing.
// Her request is followed through auth (incl. where the token comes from), rate limits, routing,
// tools, tenant-isolated data, audit, and operations; she ends happy when the reply comes back.
// Edit lines/cards here, re-run stills, then render. History and feedback: LOG.md.
//
// Scene keys: chip (top-left label) · focus (node labels kept bright; '*' = all) · cam (extra nodes to frame)
// · edges [from, to, color, 'rev'?] (highlighted with moving packets) · card {title, items[{line, text}]}
// · char {moods[{line, delay?, mood}], pops[{line, delay?, kind: say|assistant|consent, text?, who?}], approve?}
// · lines (narration; one TTS clip each) · title / summary (intro and outro overlays)
// · chapter (YouTube chapter name; consecutive scenes with the same name share a chapter).

const A = '#fbbf24'; // request path
const R = '#f87171'; // rejections
const G = '#34d399'; // results

const scenes = [
  {
    chip: 'Overview',
    title: true,
    focus: '*',
    lines: [
      'This diagram shows a multi-tenant MCP server.',
      'One MCP server, shared by many clients and many customer organizations.',
      'Every call is authenticated, rate limited, routed, isolated by tenant, and observed.',
    ],
  },
  {
    chip: 'Meet Becky',
    focus: ['Becky', 'MCP Clients'],
    char: {
      moods: [{ line: 0, mood: 'frustrated' }],
      pops: [
        { line: 0, delay: 0.6, kind: 'say', text: 'Ugh. This CRM, again… 😩' },
        { line: 1, kind: 'say', text: 'Find Dana Kim at Northwind, and add her if she’s not in the CRM.' },
      ],
    },
    lines: [
      'Meet Becky. She’s a sales rep at Acme, and she’s been fighting the CRM all morning.',
      'So she asks her AI assistant: find Dana Kim at Northwind, and add her if she’s not in the CRM.',
      'Let’s follow her request through the server.',
    ],
  },
  {
    chip: '01 · Clients & endpoint',
    focus: ['Becky', 'MCP Clients', 'CRM MCP Server'],
    edges: [['Becky', 'MCP Clients', A], ['MCP Clients', 'CRM MCP Server', A]],
    char: {
      moods: [{ line: 0, mood: 'neutral' }],
      pops: [{ line: 0, kind: 'say', text: 'Find Dana Kim at Northwind, and add her if she’s not in the CRM.' }],
    },
    lines: [
      'Becky’s assistant is an MCP client. Requests like hers come from many clients: Claude, ChatGPT, IDEs, and in-house agents.',
      'They hit the CRM MCP server over stateless Streamable HTTP, so any instance can serve any request, and the server can scale out horizontally.',
    ],
  },
  {
    chip: '02 · Where the token comes from',
    focus: ['Becky', 'MCP Clients', 'CRM MCP Server', 'OAuth'],
    edges: [['MCP Clients', 'CRM MCP Server', A]],
    char: {
      moods: [{ line: 2, mood: 'curious' }, { line: 3, delay: 0.4, mood: 'neutral' }],
      pops: [{ line: 2, kind: 'consent' }],
      approve: { line: 2, delay: 2.6 },
    },
    card: {
      title: 'Getting a token',
      items: [
        { line: 1, text: '1 · Client calls without a token → <b>401</b>, plus where to sign in' },
        { line: 2, text: '2 · Becky signs in at the <b>authorization server</b> (auth.acme.example) and approves access' },
        { line: 3, text: '3 · It issues an <b>access token</b>: org_id + scopes (crm:read, crm:write)' },
        { line: 4, text: '4 · Client sends it on every call: <code>Authorization: Bearer …</code>' },
      ],
    },
    lines: [
      'Every call needs an OAuth access token. So where does it come from? Not from this server. The MCP server never creates tokens. It only checks them.',
      'The first time a client connects without a token, the server answers with a 401, and tells it which authorization server to use.',
      'That’s the sign-in prompt Becky sees. She signs in to Acme CRM, and approves access.',
      'The authorization server then issues an access token, which carries her organization as an org_id claim, and the scopes she granted, like crm:read.',
      'From then on, the client sends that token with every request.',
    ],
  },
  {
    chip: '03 · Authentication',
    focus: ['CRM MCP Server', 'OAuth'],
    edges: [['CRM MCP Server', 'OAuth', A], ['OAuth', 'CRM MCP Server', R]],
    card: {
      title: 'Checked on every call',
      items: [
        { line: 0, text: '✓ Signature, using the authorization server’s public keys' },
        { line: 0, text: '✓ Issuer is auth.acme.example' },
        { line: 0, text: '✓ Audience is this server, not some other API' },
        { line: 0, text: '✓ Not expired' },
        { line: 1, text: '→ Tenant = <b>org_id</b> claim · scopes kept for the tools' },
        { line: 2, text: '✗ Any check fails → <b>401</b>' },
      ],
    },
    lines: [
      'On each call, the OAuth step validates the token: its signature, its issuer, that it was issued for this server, and that it hasn’t expired.',
      'Then it reads the tenant from the org_id claim, never from the tool arguments, so a client can’t ask for another customer’s data.',
      'A missing, expired, or invalid token is rejected with a 401, which goes straight back through the server to the client.',
    ],
  },
  {
    chip: '04 · Per-tenant rate limits',
    focus: ['OAuth', 'Per-Tenant Limits', 'Tool Router', 'CRM MCP Server'],
    edges: [['OAuth', 'Per-Tenant Limits', A], ['Per-Tenant Limits', 'Tool Router', A], ['Per-Tenant Limits', 'CRM MCP Server', R]],
    lines: [
      'Next come per-tenant rate limits. They sit after OAuth, because you can only count calls per tenant once you know who the tenant is.',
      '120 calls a minute, with a burst of 20.',
      'One noisy customer can’t starve everyone else. Throttled calls get a 429.',
    ],
  },
  {
    chip: '05 · Tool routing',
    focus: ['Tool Router', 'search_contacts', 'create_contact', 'delete_contact'],
    edges: [
      ['Tool Router', 'search_contacts', A], ['Tool Router', 'create_contact', A],
      ['Tool Router', 'delete_contact', A], ['Tool Router', 'CRM MCP Server', R],
    ],
    lines: [
      'The tool router dispatches each call by tool name to one of three exposed tools.',
      'Unknown tools fall through to the default branch, and get an error back through the server.',
    ],
  },
  {
    chip: '06 · Exposed tools',
    focus: ['search_contacts'],
    cam: ['search_contacts', 'create_contact', 'delete_contact'],
    lines: [
      'Each tool declares an input schema, the OAuth scope it needs, and safety hints.',
      'search_contacts needs crm:read, and is marked read-only.',
    ],
  },
  {
    chip: '06 · Exposed tools',
    focus: ['create_contact'],
    cam: ['search_contacts', 'create_contact', 'delete_contact'],
    lines: [
      'create_contact needs crm:write. A token without that scope gets a 403. Its description also tells the model to search first, to avoid duplicates. Which is exactly what Becky asked for.',
    ],
  },
  {
    chip: '06 · Exposed tools',
    focus: ['delete_contact'],
    cam: ['search_contacts', 'create_contact', 'delete_contact'],
    lines: [
      'delete_contact is also marked destructive, so well-behaved clients ask the user before calling it.',
      'But hints are only hints. The real protection is the crm:write scope, which the server enforces.',
    ],
  },
  {
    chip: '07 · Tenant-isolated data',
    focus: ['CRM Database', 'search_contacts', 'create_contact', 'delete_contact'],
    edges: [
      ['search_contacts', 'CRM Database', A], ['create_contact', 'CRM Database', A], ['delete_contact', 'CRM Database', A],
      ['CRM Database', 'search_contacts', G], ['CRM Database', 'create_contact', G], ['CRM Database', 'delete_contact', G],
    ],
    lines: [
      'All three tools read and write the CRM database: Postgres with row-level security on tenant_id.',
      'Even a buggy tool can’t read another tenant’s rows.',
    ],
  },
  {
    chip: '08 · Results',
    chapter: 'Results & back to Becky',
    focus: ['search_contacts', 'create_contact', 'delete_contact', 'CRM MCP Server'],
    edges: [
      ['search_contacts', 'CRM MCP Server', G], ['create_contact', 'CRM MCP Server', G],
      ['delete_contact', 'CRM MCP Server', G],
    ],
    lines: [
      'Results flow back to the server, which returns them to the client as JSON. Every error takes the same path.',
    ],
  },
  {
    chip: 'Back to Becky',
    chapter: 'Results & back to Becky',
    focus: ['Becky', 'MCP Clients', 'CRM MCP Server'],
    edges: [['MCP Clients', 'CRM MCP Server', G, 'rev'], ['Becky', 'MCP Clients', G, 'rev']],
    char: {
      moods: [{ line: 0, delay: 3.2, mood: 'happy' }],
      pops: [
        { line: 0, delay: 1.4, kind: 'assistant', text: 'Dana Kim wasn’t in the CRM, so I added her. ✓' },
        { line: 1, delay: 0.3, kind: 'say', text: 'Wait, that’s it? That was easy! 🎉' },
      ],
    },
    lines: [
      'Back to Becky. The results reach her assistant, and it replies: Dana wasn’t in the CRM, so I added her.',
      'One search, one create, her tenant checked at every step, and Becky never had to think about any of it.',
    ],
  },
  {
    chip: '09 · Audit log',
    focus: ['create_contact', 'delete_contact', 'Audit Log'],
    edges: [['create_contact', 'Audit Log', A], ['delete_contact', 'Audit Log', A]],
    lines: [
      'Every write is audited.',
      'Every create and delete attempt, including scope denials, records the tenant, client, tool, arguments, and result.',
    ],
  },
  {
    chip: '10 · Tracing',
    chapter: 'Tracing & error-rate monitor',
    focus: ['Tracing'],
    cam: ['Tracing', 'MCP Clients', 'CRM MCP Server'],
    lines: [
      'Finally, operations. Tracing records every step of every call, across the whole flow, with personal data redacted.',
    ],
  },
  {
    chip: '11 · Error-rate monitor',
    chapter: 'Tracing & error-rate monitor',
    focus: ['CRM MCP Server', 'Error-Rate Monitor', 'Page On-Call'],
    edges: [['CRM MCP Server', 'Error-Rate Monitor', A], ['Error-Rate Monitor', 'Page On-Call', R]],
    card: {
      title: 'What the monitor watches',
      items: [
        { line: 0, text: 'Every response the server sends back, across all tenants' },
        { line: 1, text: '<b>Error rate</b> = failed ÷ all responses, rolling 5 minutes' },
        { line: 2, text: 'Counts as failed: 401 / 403 auth · 429 rate limit · unknown tool · tool errors' },
        { line: 3, text: 'Above <b>2%</b> → page on-call' },
        { line: 4, text: 'Spike of 401s → broken token rollout · 429s → runaway client · tool errors → failing backend' },
      ],
    },
    lines: [
      'The error-rate monitor watches every response the server sends back, for all tenants.',
      'It divides failed responses by all responses, over a rolling five-minute window.',
      'Failures include auth rejections, rate-limit hits, unknown tools, and tools that fail, for example when the database is down.',
      'If more than 2 percent of responses fail, it pages on-call.',
      'The type of error points to the cause. A spike of 401s often means a broken token rollout. A wall of 429s, a runaway client. And tool errors, a failing backend.',
    ],
  },
  {
    chip: 'Summary',
    focus: '*',
    summary: true,
    char: { pops: [{ line: 1, kind: 'say', text: 'Thanks! 😄' }] },
    lines: [
      'Authenticate. Limit. Route. Isolate. Audit. Observe.',
      'That’s how one MCP server safely serves many clients and many tenants.',
    ],
  },
];

export default {
  template: 'Multi-Tenant MCP Server',
  title: { kicker: 'Architecture walkthrough', heading: 'Multi-Tenant MCP Server', sub: 'How one MCP server safely serves many clients and tenants' },
  summary: ['Authenticate', 'Limit', 'Route', 'Isolate', 'Audit', 'Observe'],
  character: { label: 'Becky', anchor: 'MCP Clients', startMood: 'frustrated', look: {} },
  speak: [],
  thumbnail: { text: 'One MCP server, **many tenants**', frame: 205, crop: [630, 610, 570, 130], mark: { circle: [332, 96, 213, 22] }, badge: 'Row-level security', mood: 'curious', pose: 'thinking' },
  youtube: {
    title: 'How a Multi-Tenant MCP Server Works: OAuth, Rate Limits, Tool Routing & Tenant Isolation',
    description: `
One MCP server, shared by many AI clients and many customer organizations. How do you keep every tenant's data separate, every call authenticated, and every write accountable?

Follow Becky, a sales rep, as her AI assistant's request travels through a production-style multi-tenant MCP server, from her question to the CRM and back.

What you'll learn:
• Where the OAuth token actually comes from (hint: not from the MCP server) and what gets checked on every call
• Why the tenant comes from the token's org_id claim, never from tool arguments
• Per-tenant rate limits, and why they sit after authentication
• Tool routing, scopes, and why readOnly/destructive hints are only hints
• Tenant isolation with Postgres row-level security
• Audit logs for every write attempt, tracing, and an error-rate monitor that sees every failure`,
    tags: ['MCP', 'Model Context Protocol', 'MCP server', 'multi-tenant', 'OAuth', 'AI agents', 'LLM', 'AI architecture', 'rate limiting', 'row-level security', 'Claude'],
  },
  scenes,
};
