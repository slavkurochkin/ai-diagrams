// Scenario: Hands-on MCP, episode 3: Breaking it on purpose. Rendered with app.mjs (real UI, real terminal).
// Story: Becky tries to make the server misbehave: a flood (429 + Retry-After, and the neighbor tenant is
// unaffected), bad arguments (a tool error the model can read), a tool that doesn't exist, a delete aimed at
// another tenant (indistinguishable from a missing id; audited), and the metrics that count it all.
// History and feedback: LOG.md. Scene keys: see the header of ../../app.mjs.
const H = `-H 'content-type: application/json' -H 'accept: application/json, text/event-stream'`;
const LIST = `'{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`;
const call = (token, extra = '') => `curl -s ${extra} -X POST http://localhost:8787/mcp -H "Authorization: Bearer {{${token}}}" ${H} -d ${LIST}`;
const PSQL = (sql) => `docker compose exec -T db psql -U postgres -d crm -c "${sql}"`;

const scenes = [
  {
    chip: 'Intro',
    title: true,
    lines: [
      'Hands-on MCP, episode three: breaking it on purpose.',
      'A server that only works when everyone behaves isn’t ready for production. Let’s misbehave.',
    ],
  },
  {
    chip: 'Time to break things',
    chapter: 'Intro',
    char: { moods: [{ line: 0, mood: 'happy' }], pops: [{ line: 0, delay: 0.6, kind: 'say', text: 'Let’s break it! 😈' }] },
    do: [{ line: 0, delay: 0.4, act: 'click', target: 'switch=acme-crm' }],
    lines: [
      'Becky has seen the server behave. Now she wants to see how it misbehaves, and whether it fails safely.',
    ],
  },
  {
    chip: '01 · A flood',
    chapter: 'A flood: 429 and Retry-After',
    terminal: { pos: 'left' },
    card: {
      title: 'A token bucket, per tenant',
      items: [
        { line: 1, text: '120 calls a minute, bursts of up to 20' },
        { line: 1, text: 'Bucket empty → <b>429</b> Too Many Requests' },
        { line: 2, text: '<code>Retry-After</code>: seconds until there’s room again' },
        { line: 2, text: 'Refills at 2 calls a second' },
      ],
    },
    char: { moods: [{ line: 1, mood: 'curious' }] },
    do: [
      { line: 0, delay: 0.6, act: 'run',
        // -D keeps each response's headers; after the loop, show the last one (a 429) rather than calling again,
        // because the bucket refills at 2 calls a second and a fresh call could already succeed
        cmd: `for i in $(seq 1 26); do ${call('ACME', `-D /tmp/last-headers -o /dev/null -w '%{http_code} '`)}; done; echo; grep -iE '^HTTP|retry-after' /tmp/last-headers`,
        display: `for i in $(seq 26); do curl -s -D last-headers -o /dev/null -w '%{http_code} ' …/mcp -H "Authorization: Bearer $ACME" -d '{…tools/list…}'; done; grep -iE 'HTTP|retry-after' last-headers` },
    ],
    lines: [
      'First, a flood. Becky fires twenty-six calls in a row with Acme’s token.',
      'The first ones go through. Then Acme’s burst allowance runs out, and every call after that gets 429: too many requests.',
      'Each 429 says when to come back. Retry-After: the seconds until the bucket has room again. A well-behaved client waits that long.',
    ],
  },
  {
    chip: '02 · The neighbor doesn’t notice',
    chapter: 'The neighbor doesn’t notice',
    terminal: { pos: 'left' },
    card: {
      title: 'Why Globex is fine',
      items: [
        { line: 0, text: 'Buckets are keyed by <b>tenant</b>, taken from the token' },
        { line: 1, text: 'Acme’s flood → only Acme’s 429s' },
        { line: 2, text: 'In memory, per instance. With several instances, keep buckets in a shared store like Redis' },
      ],
    },
    char: { moods: [{ line: 1, delay: 1.0, mood: 'happy' }] },
    do: [
      { line: 0, delay: 1.2, act: 'run',
        cmd: `for i in $(seq 1 25); do ${call('ACME', '-o /dev/null')}; done; for i in 1 2 3; do ${call('ACME', `-o /dev/null -w '%{http_code} '`)}; done; echo '← acme'; ${call('GLOBEX', `-o /dev/null -w '%{http_code} '`)}; echo '← globex'`,
        display: `# Acme floods again (25 calls, output hidden), then 3 more Acme calls, then 1 Globex call` },
    ],
    lines: [
      'Becky floods as Acme again, and right after, makes one call as Globex, the other tenant.',
      'Acme: 429, 429, 429. Globex: 200. The flood stays inside Acme’s own bucket.',
      'That’s why the limit comes after authentication: the server needs the tenant to know whose bucket to use.',
    ],
  },
  {
    chip: '03 · Bad arguments',
    chapter: 'Bad arguments: a tool error',
    cardPos: 'bottomleft',
    card: {
      title: 'Validation, on the server',
      items: [
        { line: 1, text: 'The input schema says <code>email</code> must be an email' },
        { line: 1, text: 'Rejected before any code or database runs' },
        { line: 2, text: 'A <b>tool error</b>: a normal answer (the log says OK) the model can read and fix' },
      ],
    },
    char: { moods: [{ line: 0, mood: 'curious' }] },
    do: [
      { line: 0, delay: 0.2, act: 'click', target: 'text=Tools' },
      { line: 0, delay: 0.9, act: 'click', target: 'text=Create contact' },
      { line: 0, delay: 1.6, act: 'type', target: 'label=name *', text: 'Dana Kim' },
      { line: 0, delay: 2.8, act: 'type', target: 'label=email', text: 'not-an-email' },
      { line: 0, delay: 4.2, act: 'click', target: 'text=Execute Tool' },
    ],
    highlight: [
      { line: 1, until: 2, target: 'text=Tool Error', label: 'invalid email' },
      { line: 2, target: '.mantine-Badge-root:text-is("OK")', label: 'still OK' },
    ],
    lines: [
      'Next, bad input. Create contact, Dana Kim, with an email address that isn’t one.',
      'The server’s input schema rejects it: invalid email address. Nothing reaches the database.',
      'And notice the protocol log says OK. A tool error is a normal answer, not a broken request, so an AI model can read the message, and correct its own mistake.',
    ],
  },
  {
    chip: '04 · A tool that doesn’t exist',
    chapter: 'A tool that doesn’t exist',
    terminal: { pos: 'right' },
    cardPos: 'bottomleft',
    card: {
      title: 'Unknown tools',
      items: [
        { line: 1, text: 'Inspector CLI: “not found on server”, exit code 5' },
        { line: 1, text: 'Server: tool error, <code>Tool drop_all_tables not found</code>' },
        { line: 2, text: 'Only registered tools can ever run' },
      ],
    },
    do: [
      { line: 0, delay: 0.1, act: 'clear' },
      { line: 0, delay: 2.4, act: 'run', cmd: `cd {{ROOT}} && npx mcp-inspector --cli --transport http --server-url http://localhost:8787/mcp --header "Authorization: Bearer {{GLOBEX}}" --method tools/call --tool-name drop_all_tables --tool-args-json '{}' --format json; echo "exit code $?"`,
        display: `npx @modelcontextprotocol/inspector --cli --transport http --server-url …/mcp --header "Authorization: Bearer $GLOBEX" --method tools/call --tool-name drop_all_tables; echo "exit code $?"` },
      { line: 1, delay: 2.2, act: 'run', cmd: `curl -s -X POST http://localhost:8787/mcp -H "Authorization: Bearer {{GLOBEX}}" ${H} -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"drop_all_tables","arguments":{}}}'`,
        display: `curl -s …/mcp -H "Authorization: Bearer $GLOBEX" -d '{…"name":"drop_all_tables"…}'` },
    ],
    lines: [
      'What about a tool that doesn’t exist? The Inspector’s command-line mode makes that easy to try.',
      'It refuses: drop all tables isn’t on this server, exit code five. Asked directly, the server says the same: a tool error, tool not found.',
      'Only the three tools the server registered can ever run. Whatever a model invents, the server just says no.',
    ],
  },
  {
    chip: '05 · A delete aimed at another tenant',
    chapter: 'A delete aimed at another tenant',
    cardPos: 'bottomleft',
    card: {
      title: 'Deleting Globex’s Dana, as Acme',
      items: [
        { line: 1, text: 'To Acme, row <code>c_201</code> doesn’t exist (row-level security)' },
        { line: 2, text: 'Same answer as a truly missing id: no way to probe which ids exist' },
        { line: 3, text: 'Dana untouched, and the attempt is audited' },
      ],
    },
    char: { moods: [{ line: 0, mood: 'curious' }, { line: 3, delay: 0.5, mood: 'happy' }] },
    do: [
      { line: 0, delay: 0.3, act: 'click', target: 'text=Delete contact' },
      { line: 0, delay: 1.0, act: 'type', target: 'label=id *', text: 'c_201' },
      { line: 0, delay: 6.2, act: 'click', target: 'text=Execute Tool' },
    ],
    highlight: [{ line: 1, until: 3, target: 'text=Results', label: 'No contact with id c_201' }],
    lines: [
      'Now the nasty one. With Acme’s token, Becky tries to delete contact c 201: Dana Kim, who belongs to Globex. She even knows the exact ID.',
      'No contact with that ID. To Acme, Globex’s row simply doesn’t exist, so it can’t be deleted.',
      'And the answer is exactly what you’d get for an ID that truly doesn’t exist, so an attacker can’t even learn which IDs are real.',
      'Dana is untouched, and the attempt is in the audit log.',
    ],
  },
  {
    chip: '05 · A delete aimed at another tenant',
    chapter: 'A delete aimed at another tenant',
    terminal: { pos: 'full' },
    do: [
      { line: 0, delay: 0.1, act: 'clear' },
      { line: 0, delay: 0.4, act: 'run', cmd: PSQL("select id, tenant_id, name from contacts where id = 'c_201'") },
      { line: 0, delay: 2.4, act: 'run', cmd: PSQL('select at::time(0), tenant_id, client_id, tool, arguments, outcome, detail from audit_log') },
    ],
    lines: [
      'In the database: c 201 is still there, still Globex’s. And the audit log has Acme’s failed delete, with the ID it aimed at.',
    ],
  },
  {
    chip: '06 · Counting it all',
    chapter: 'The metrics count it all',
    terminal: { pos: 'left' },
    card: {
      title: 'What the error-rate monitor sees',
      items: [
        { line: 0, text: 'Every response, per tenant and outcome' },
        { line: 1, text: 'Acme: <b>429</b>s from the floods, <b>tool_error</b>s: the bad email and the failed delete' },
        { line: 1, text: 'Globex: one <b>tool_error</b>, the made-up tool, called with its token' },
        { line: 2, text: '429 spike → a runaway client · tool errors → a model misusing a tool' },
      ],
    },
    do: [
      { line: 0, delay: 0.1, act: 'clear' },
      { line: 0, delay: 0.5, act: 'run', cmd: 'curl -s http://localhost:8787/metrics', display: 'curl -s localhost:8787/metrics' },
    ],
    lines: [
      'Finally, the server’s metrics. Every response is counted, per tenant and outcome.',
      'There are Acme’s 429s from the floods, and its two tool errors: the bad email, and the failed delete. Globex has one tool error: the made-up tool, which Becky called with Globex’s token.',
      'This is what the error-rate monitor watches. A spike of 429s points to a runaway client. A spike of tool errors, to a model misusing a tool.',
    ],
  },
  {
    chip: 'Summary',
    summary: true,
    char: { moods: [{ line: 0, mood: 'happy' }], pops: [{ line: 1, delay: 0.5, kind: 'say', text: 'It failed safely every time. 😎' }] },
    lines: [
      'Throttle. Validate. Refuse. Isolate. Count.',
      'Next time: from clicking to automation. The Inspector’s command line, contract tests, and evals.',
    ],
  },
];

export default {
  renderer: 'app',
  template: 'MCP Inspector + acme-crm-mcp demo server',
  title: { kicker: 'Hands-on MCP · Episode 3', heading: 'Breaking It on Purpose', sub: 'Floods, bad input, and a delete aimed at another tenant' },
  summary: ['Throttle', 'Validate', 'Refuse', 'Isolate', 'Count'],
  character: { label: 'Becky', startMood: 'happy', look: { tag: 'Becky · trying it herself' } },
  setup: {
    tokens: { ACME: 'acme-agent', GLOBEX: 'globex-agent' },
    servers: { 'acme-crm': { type: 'streamable-http', url: 'http://localhost:8787/mcp', headers: { Authorization: 'Bearer {{ACME}}' } } },
  },
  displayOutput: (out) => out.replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, (t) => `${t.slice(0, 28)}…${t.slice(-8)}  (${t.length} chars)`),
  speak: [[/\bMCP\b/g, 'M C P'], [/\b429s?\b/g, (m) => (m.endsWith('s') ? 'four twenty-nines' : 'four twenty-nine')], [/\b200\b/g, 'two hundred'], [/\bID\b/g, 'I D'], [/\bIDs\b/g, 'I Ds'], [/\bc 201\b/g, 'C two oh one']],
  youtube: {
    title: 'Breaking an MCP Server on Purpose: 429s, Bad Input, Cross-Tenant Deletes (Hands-on MCP, Ep. 3)',
    description: `
What happens when an MCP client floods your server, sends garbage, or tries to delete another customer's data?

Becky deliberately misbehaves against a real multi-tenant MCP server, using the MCP Inspector, its command-line mode, and curl, and checks that it fails safely every time.

What you'll learn:
• Per-tenant rate limiting: 429 Too Many Requests, Retry-After, and why the neighbor tenant isn't affected
• Server-side input validation, and why tool errors are normal answers an AI model can learn from
• What happens when a client calls a tool that doesn't exist
• A cross-tenant delete with the exact ID, and why it's indistinguishable from a missing record
• Audit logs and metrics that count 429s and tool errors, the signals an error-rate monitor watches`,
    tags: ['MCP', 'Model Context Protocol', 'MCP Inspector', 'rate limiting', '429', 'input validation', 'multi-tenant', 'security testing', 'AI agents', 'observability', 'Claude'],
  },
  scenes,
};
