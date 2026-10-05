// Scenario: Hands-on MCP, episode 2: Tokens and tenants, live. Rendered with app.mjs (real UI, real terminal).
// Story: Becky's Dana Kim puzzle from ep. 1. She swaps to a Globex token and Dana appears, proves the
// isolation lives in Postgres (row-level security), then tries a read-only token on a write (403, and the
// Inspector's step-up attempt), reads the audit log, and watches expired / wrong-audience tokens bounce.
// History and feedback: LOG.md. Scene keys: see the header of ../../app.mjs.
const CURL = (token, body) =>
  `curl -si -X POST http://localhost:8787/mcp -H "Authorization: Bearer ${token}" -H 'content-type: application/json' ` +
  `-H 'accept: application/json, text/event-stream' -d '${body}' | grep -iE '^HTTP|www-authenticate|"message"'`;
const CREATE_DANA = '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"create_contact","arguments":{"name":"Dana Kim"}}}';
const LIST = '{"jsonrpc":"2.0","id":1,"method":"tools/list"}';
const PSQL = (user, sql) => `docker compose exec -T db psql -U ${user} -d crm -c "${sql}"`;

// swap the Authorization header in the server's settings, then reconnect (headers apply on the next connect)
const swapHeader = (line, token) => [
  { line, delay: 0.2, act: 'click', target: 'text=Servers' },
  { line, delay: 1.0, act: 'click', target: 'text=Settings' },
  { line, delay: 2.0, act: 'click', target: 'text=Options' },
  { line, delay: 2.6, act: 'click', target: 'text=Custom Headers' },
  { line, delay: 3.6, act: 'paste', target: 'placeholder=Value', text: `Bearer {{${token}}}` },
  { line, delay: 5.0, act: 'click', target: 'role=["button",{"name":"Close","exact":true}]' },
  { line, delay: 5.8, act: 'click', target: 'switch=acme-crm' },
  { line, delay: 6.8, act: 'click', target: 'switch=acme-crm' },
];

const scenes = [
  {
    chip: 'Intro',
    title: true,
    lines: [
      'Hands-on MCP, episode two: tokens and tenants, live.',
      'Same server, same tools, different tokens. Let’s see how different the world looks.',
    ],
  },
  {
    chip: 'Where’s Dana?',
    chapter: 'Where’s Dana?',
    char: {
      moods: [{ line: 0, mood: 'curious' }],
      pops: [{ line: 1, delay: 0.3, kind: 'say', text: 'She’s in the system. I’ve seen her! 🤔' }],
    },
    do: [
      { line: 0, delay: 0.4, act: 'click', target: 'switch=acme-crm' },
      { line: 0, delay: 2.0, act: 'click', target: 'text=Tools' },
      { line: 0, delay: 2.8, act: 'click', target: 'text=Search contacts' },
      { line: 0, delay: 3.4, act: 'type', target: 'label=query *', text: 'Dana' },
      { line: 0, delay: 4.6, act: 'click', target: 'text=Execute Tool' },
    ],
    highlight: [{ line: 1, target: 'text=Results', label: '0 matches with Acme’s token' }],
    lines: [
      'Last time, Becky searched for Dana Kim with Acme’s token, and got zero matches.',
      'But Dana does exist. She’s a contact of Globex, another company on the same server. To test isolation, Becky’s team registered a test client for Globex, too.',
    ],
  },
  {
    chip: '01 · A Globex token',
    chapter: 'A token for another tenant',
    terminal: { pos: 'right' },
    cardPos: 'bottomleft',
    card: {
      title: 'Same server, another tenant',
      items: [
        { line: 0, text: 'Client <code>globex-agent</code>, registered for Globex' },
        { line: 1, text: '<code>org_id: globex</code> → a different tenant' },
        { line: 1, text: 'Same audience, same scopes, same server' },
      ],
    },
    do: [
      { line: 0, delay: 0.3, act: 'run', cmd: 'npm run -s token -- globex-agent', display: 'export GLOBEX=$(npm run -s token -- globex-agent)', saveAs: 'GLOBEX', quiet: true },
      { line: 1, delay: 0.2, act: 'run', cmd: 'npm run -s decode -- {{GLOBEX}} | grep -E "org_id|scope|aud"', display: 'npm run decode -- $GLOBEX | grep -E "org_id|scope|aud"' },
    ],
    lines: [
      'Becky asks the authorization server for a Globex token.',
      'Decoded, it’s the same shape as before: same server, same scopes. Only the org ID differs. Globex.',
    ],
  },
  {
    chip: '02 · Switching tenants',
    chapter: 'Switching tenants',
    char: {
      moods: [{ line: 1, delay: 2.5, mood: 'happy' }],
      pops: [{ line: 1, delay: 2.8, kind: 'say', text: 'There she is! 😮' }],
    },
    do: [
      ...swapHeader(0, 'GLOBEX'),
      { line: 1, delay: 0.3, act: 'click', target: 'text=Tools' },
      { line: 1, delay: 0.9, act: 'click', target: 'text=Search contacts' },
      { line: 1, delay: 1.4, act: 'type', target: 'label=query *', text: 'Dana' },
      { line: 1, delay: 2.4, act: 'click', target: 'text=Execute Tool' },
    ],
    highlight: [
      { line: 0, delay: 3.8, until: 1, target: 'placeholder=Value', label: 'Bearer <Globex token>' },
      { line: 2, target: 'text=Results', label: 'Dana Kim · c_201 · Globex' },
    ],
    lines: [
      'She swaps the Authorization header for the Globex token. Headers are sent from the next connection on, so she disconnects, and connects again.',
      'Same tool, same query: Dana.',
      'There she is. Dana Kim, contact c 201, at Northwind. Same server, same tool, same question. The token decides which world you see.',
    ],
  },
  {
    chip: '03 · Isolation lives in the database',
    chapter: 'Isolation lives in the database',
    terminal: { pos: 'left' },
    card: {
      title: 'Row-level security',
      items: [
        { line: 0, text: 'One table, every tenant’s rows' },
        { line: 1, text: 'The app connects as <code>app_user</code>, not the owner' },
        { line: 1, text: 'No tenant set → <b>0 rows</b>' },
        { line: 2, text: 'Per call: <code>app.tenant_id</code> = the token’s <code>org_id</code> → only that tenant’s rows' },
        { line: 3, text: 'Even a buggy query can’t cross tenants' },
      ],
    },
    char: { moods: [{ line: 3, mood: 'happy' }], pops: [{ line: 3, delay: 0.5, kind: 'say', text: 'So even a bug can’t leak it. Nice. 😌' }] },
    do: [
      { line: 0, delay: 0.1, act: 'clear' },
      { line: 0, delay: 0.3, act: 'run', cmd: PSQL('postgres', 'select id, tenant_id, name from contacts order by tenant_id, id') },
      { line: 1, delay: 1.2, act: 'run', cmd: PSQL('app_user', 'select count(*) from contacts') },
      { line: 2, delay: 1.0, act: 'run', cmd: `docker compose exec -T db psql -U app_user -d crm -qAt -c "begin" -c "select set_config('app.tenant_id', 'acme', true)" -c "select name from contacts" -c "commit"`,
        display: `psql -U app_user … "set app.tenant_id = 'acme'; select name from contacts"` },
    ],
    lines: [
      'Where does that isolation come from? Becky looks in the database. As the owner, she sees one contacts table, holding both tenants.',
      'But the server never connects as the owner. It connects as app user. And app user, with no tenant set, sees nothing at all. Zero rows.',
      'On every call, the server sets the tenant from the token’s org ID, inside the transaction. Now app user sees Acme’s contacts, and only Acme’s.',
      'That’s row-level security. The filter lives in Postgres, so even a buggy query can’t cross tenants.',
    ],
  },
  {
    chip: '04 · A read-only token',
    chapter: 'A read-only token tries to write',
    terminal: { pos: 'right' },
    do: [
      { line: 0, delay: 0.1, act: 'clear' },
      { line: 0, delay: 0.3, act: 'run', cmd: 'npm run -s token -- acme-readonly', display: 'export RO=$(npm run -s token -- acme-readonly)', saveAs: 'RO', quiet: true },
      ...swapHeader(1, 'RO'),
    ],
    lines: [
      'Next, scopes. Becky’s team also registered a read-only client for Acme: it may read contacts, never change them.',
      'She switches the Inspector to the read-only token, and reconnects.',
      'Headers are sent from the next connection on, so she disconnects, and connects again, now as the read-only client.',
    ],
  },
  {
    chip: '04 · A read-only token',
    chapter: 'A read-only token tries to write',
    cardPos: 'bottomleft',
    card: {
      title: 'What happened',
      items: [
        { line: 1, text: 'Server: <b>403</b>, <code>insufficient_scope</code>, needs <code>crm:write</code>' },
        { line: 2, text: 'The Inspector tries <b>step-up</b>: get a better token from the authorization server' },
        { line: 2, text: 'No sign-in endpoint here, so that fails: the error you see is about the auth server' },
      ],
    },
    char: {
      moods: [{ line: 1, delay: 0.5, mood: 'frustrated' }, { line: 2, mood: 'curious' }],
      pops: [{ line: 0, delay: 3.5, kind: 'say', text: 'Tool Call Failed… with an auth error? 🤨' }],
    },
    do: [
      { line: 0, delay: 0.2, act: 'click', target: 'text=Tools' },
      { line: 0, delay: 0.8, act: 'click', target: 'text=Create contact' },
      { line: 0, delay: 1.6, act: 'type', target: 'label=name *', text: 'Dana Kim' },
      { line: 0, delay: 3.0, act: 'click', target: 'text=Execute Tool' },
      { line: 1, delay: 0.3, act: 'click', target: 'text=Network' },
    ],
    highlight: [
      { line: 0, delay: 3.6, until: 1, target: 'text=Tool Call Failed', label: 'failed' },
      { line: 1, delay: 1.0, target: '.mantine-Badge-root:has-text("403")', label: '403: insufficient scope' },
    ],
    lines: [
      'Now a write. Create contact, Dana Kim, execute. Tool call failed.',
      'The network log shows what really happened. The server answered 403: valid token, wrong scope. Create contact needs C R M write.',
      'A 403 like this also tells the client which scope is missing, so the Inspector tried to get a better token, called step-up authorization. This demo’s authorization server has no sign-in page, so that attempt fails, and that’s the error on screen.',
    ],
  },
  {
    chip: '05 · The server’s answer, and the audit log',
    chapter: 'The server’s answer, and the audit log',
    terminal: { pos: 'full' },
    char: { moods: [{ line: 2, mood: 'happy' }] },
    do: [
      { line: 0, delay: 0.1, act: 'clear' },
      { line: 0, delay: 0.5, act: 'run', cmd: CURL('{{RO}}', CREATE_DANA), display: `curl -si …/mcp -H "Authorization: Bearer $RO" -d '{…create_contact…}' | grep -iE 'HTTP|www-authenticate|message'` },
      { line: 2, delay: 0.3, act: 'run', cmd: PSQL('postgres', 'select at::time(0), tenant_id, client_id, tool, outcome, detail from audit_log') },
    ],
    lines: [
      'Becky sends the same call herself with curl. 403 Forbidden. The WWW-Authenticate header says exactly what’s wrong: insufficient scope, and the scope needed: C R M write.',
      'Compare that with 401. 401 means: who are you? 403 means: I know who you are, and you’re not allowed to do this.',
      'And the attempt didn’t vanish. The audit log has both denied writes: tenant, client, tool, outcome, and why. Every write attempt is recorded, including the ones that fail.',
    ],
  },
  {
    chip: '06 · Bad tokens',
    chapter: 'Expired and wrong-audience tokens',
    terminal: { pos: 'full' },
    do: [
      { line: 0, delay: 0.1, act: 'clear' },
      { line: 0, delay: 1.2, act: 'run', cmd: 'npm run -s token -- acme-agent --expired', display: 'export OLD=$(npm run -s token -- acme-agent --expired)', saveAs: 'OLD', quiet: true },
      { line: 0, delay: 3.2, act: 'run', cmd: CURL('{{OLD}}', LIST), display: `curl -si …/mcp -H "Authorization: Bearer $OLD" -d '{…tools/list…}' | grep …` },
      { line: 2, delay: 0.2, act: 'run', cmd: 'npm run -s token -- acme-agent --audience https://other-api.example/mcp', display: 'export OTHER=$(npm run -s token -- acme-agent --audience https://other-api.example/mcp)', saveAs: 'OTHER', quiet: true },
      { line: 2, delay: 2.6, act: 'run', cmd: CURL('{{OTHER}}', LIST), display: `curl -si …/mcp -H "Authorization: Bearer $OTHER" -d '{…tools/list…}' | grep …` },
    ],
    lines: [
      'Last test: bad tokens. These are test-only tokens, minted locally with the demo signing key. First, one that expired an hour ago.',
      '401, invalid token: the expiry check failed. A stolen token is only useful until it expires.',
      'Next, a perfectly valid token, issued for a different server.',
      'Also 401: unexpected audience. A token meant for another API can’t be replayed here, even though the signature is genuine.',
    ],
  },
  {
    chip: 'Summary',
    summary: true,
    char: { moods: [{ line: 0, mood: 'happy' }], pops: [{ line: 1, delay: 0.5, kind: 'say', text: 'Next: let’s break it! 😈' }] },
    lines: [
      'Tenant. Scope. Audit. Expiry.',
      'Next time, Becky breaks things on purpose: rate limits, bad arguments, and a delete aimed at another tenant.',
    ],
  },
];

export default {
  renderer: 'app',
  template: 'MCP Inspector + acme-crm-mcp demo server',
  title: { kicker: 'Hands-on MCP · Episode 2', heading: 'Tokens and Tenants, Live', sub: 'Same server, different tokens, different worlds' },
  summary: ['Tenant', 'Scope', 'Audit', 'Expiry'],
  character: { label: 'Becky', startMood: 'curious', look: { tag: 'Becky · trying it herself' } },
  setup: {
    tokens: { ACME: 'acme-agent' },
    servers: { 'acme-crm': { type: 'streamable-http', url: 'http://localhost:8787/mcp', headers: { Authorization: 'Bearer {{ACME}}' } } },
  },
  displayOutput: (out) => out.replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, (t) => `${t.slice(0, 28)}…${t.slice(-8)}  (${t.length} chars)`),
  speak: [[/\bMCP\b/g, 'M C P'], [/\b401\b/g, 'four oh one'], [/\b403\b/g, 'four oh three'], [/\bCRM\b/g, 'C R M'], [/org_id/g, 'org I D'], [/\bID\b/g, 'I D'], [/\bc 201\b/g, 'C two oh one'], [/\bcurl\b/g, 'curl'], [/WWW-Authenticate/g, 'W W W authenticate'], [/app user/g, 'app user']],
  youtube: {
    title: 'MCP Server Security, Live: Tenants, Scopes, 403s, and Bad Tokens (Hands-on MCP, Ep. 2)',
    description: `
Same MCP server, same tool, same question, so why does one token find Dana Kim and another doesn't?

Becky continues exploring a real multi-tenant MCP server with the MCP Inspector: she switches tenants, looks inside the database, and tries tokens that should fail.

What you'll learn:
• Switching tenants by switching tokens, and seeing different data from the same tool
• Where tenant isolation really lives: Postgres row-level security, and why the app never connects as the owner
• What a read-only token gets on a write: 403 insufficient_scope, and how MCP clients try step-up authorization
• 401 vs 403, and the WWW-Authenticate header that explains each
• An audit log that records denied write attempts, not just successful ones
• Why expired and wrong-audience tokens are rejected even with a genuine signature`,
    tags: ['MCP', 'Model Context Protocol', 'MCP Inspector', 'OAuth', 'scopes', '403', 'row-level security', 'multi-tenant', 'audit log', 'JWT', 'Claude'],
  },
  scenes,
};
