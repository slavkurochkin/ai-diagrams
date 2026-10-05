// Scenario: Hands-on MCP, episode 4: From clicking to automation. Rendered with app.mjs (real terminal).
// Story: everything Becky checked by hand in episodes 1–3 becomes automation: the Inspector CLI, a smoke
// test that checks exit codes, the contract test suite, and the tool-use eval (golden cases + a tested
// scorer). The live eval scene is included only when a Claude API key is available at render time; the
// narration never claims results it didn't see.
// History and feedback: LOG.md. Scene keys: see the header of ../../app.mjs.
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const ACME_DIR = process.env.ACME_DIR || join(homedir(), 'Documents/dev/acme-crm-mcp');
const HAS_KEY = Boolean(process.env.ANTHROPIC_API_KEY) || existsSync(join(ACME_DIR, '.env'));
const CLI = (args) => `npx mcp-inspector --cli --transport http --server-url http://localhost:8787/mcp --header "Authorization: Bearer {{ACME}}" ${args}`;
const CLI_SHOWN = (args) => `npx @modelcontextprotocol/inspector --cli --transport http --server-url …/mcp --header "Authorization: Bearer $ACME" ${args}`;

const evalScene = HAS_KEY
  ? {
      chip: '05 · Running the eval',
      chapter: 'Running the eval',
      terminal: { pos: 'full' },
      do: [
        { line: 0, delay: 0.1, act: 'clear' },
        { line: 0, delay: 0.6, act: 'run', cmd: 'npm run -s eval:tools 2>&1 | grep -v "^details:"', display: 'npm run eval:tools' },
      ],
      lines: [
        'And this is a real run. Each case goes through a real Claude model, connected to this server like any client, with the database reset to the case’s seeded data.',
        'Every turn’s tool calls are scored on the four checks, and the summary at the bottom is the gate: the weakest model has to reach ninety five percent, or the release is blocked.',
      ],
    }
  : {
      chip: '05 · Running the eval',
      chapter: 'Running the eval',
      terminal: { pos: 'full' },
      do: [
        { line: 0, delay: 0.1, act: 'clear' },
        { line: 0, delay: 0.6, act: 'run', cmd: 'npm run -s eval:tools 2>&1 | tail -3', display: 'npm run eval:tools' },
      ],
      lines: [
        'Running the eval itself calls a real Claude model, so it needs an API key. This machine doesn’t have one, and the run stops right there with a clear message.',
        'With a key, each case runs through every client model you support, every turn is scored, and the weakest model gates the release. It costs a few cents a run.',
      ],
    };

const scenes = [
  {
    chip: 'Intro',
    title: true,
    lines: [
      'Hands-on MCP, episode four: from clicking to automation.',
      'Everything Becky checked by hand, a machine can check before every release.',
    ],
  },
  {
    chip: 'Clicking doesn’t scale',
    chapter: 'Intro',
    char: { moods: [{ line: 0, mood: 'curious' }], pops: [{ line: 0, delay: 0.6, kind: 'say', text: 'Clicking proves it once. But every release? 🤔' }] },
    lines: [
      'Becky clicked through tokens, tenants, floods, and bad input. It all worked. But nobody can click through all of that before every release.',
    ],
  },
  {
    chip: '01 · The Inspector, scripted',
    chapter: 'The Inspector, scripted',
    terminal: { pos: 'full' },
    do: [
      { line: 0, delay: 1.0, act: 'run', cmd: `${CLI('--method tools/list --format json')} | jq -c '.result.tools[] | {name, readOnly: .annotations.readOnlyHint, destructive: .annotations.destructiveHint}'`,
        display: `${CLI_SHOWN('--method tools/list --format json')} | jq …` },
      { line: 1, delay: 0.6, act: 'run', cmd: `${CLI(`--method tools/call --tool-name search_contacts --tool-args-json '{"query":"Priya"}' --format json`)} | jq -r '.result.content[0].text'`,
        display: `${CLI_SHOWN(`--method tools/call --tool-name search_contacts --tool-args-json '{"query":"Priya"}' --format json`)} | jq …` },
    ],
    lines: [
      'First, the same Inspector, without the browser. Its command-line mode lists the tools, with their hints, as JSON.',
      'And calls them. Search contacts, Priya. Same server, same token, same answer as in the browser, but now a script can read it.',
    ],
  },
  {
    chip: '02 · Exit codes are the test',
    chapter: 'A smoke test from exit codes',
    terminal: { pos: 'left' },
    card: {
      title: 'Inspector CLI exit codes',
      items: [
        { line: 0, text: '<b>0</b> → success' },
        { line: 0, text: '<b>3</b> → authentication required' },
        { line: 0, text: '<b>5</b> → the tool returned an error' },
        { line: 1, text: 'Smoke test = calls + expected exit codes' },
        { line: 2, text: 'Runs after every deploy, in seconds' },
      ],
    },
    do: [
      { line: 0, delay: 0.1, act: 'clear' },
      { line: 0, delay: 2.0, act: 'run', cmd: `grep '^check "' scripts/smoke.sh | cut -c1-90`, display: `grep '^check' scripts/smoke.sh` },
      { line: 1, delay: 2.4, act: 'run', cmd: 'npm run -s smoke', display: 'npm run smoke' },
    ],
    lines: [
      'The command line also reports how a call went through its exit code. Zero for success, three when authentication is required, five when the tool returned an error.',
      'So a smoke test is just a list of calls and the exit codes they should produce. A valid call, no token, an unknown tool, a bad email.',
      'Five checks, five passes, in seconds. Run it after every deploy, and a broken server never stays broken for long.',
    ],
  },
  {
    chip: '03 · The contract tests',
    chapter: 'The contract tests',
    terminal: { pos: 'full' },
    char: { moods: [{ line: 2, mood: 'happy' }] },
    do: [
      { line: 0, delay: 0.1, act: 'clear' },
      { line: 0, delay: 1.0, act: 'run', cmd: 'npx vitest run tests/contract.test.ts --reporter=verbose 2>&1 | grep -E "✓|×|Tests " | sed -E "s/ [0-9]+ms$//"',
        display: 'npx vitest run tests/contract.test.ts --reporter=verbose' },
    ],
    lines: [
      'Deeper than a smoke test: the contract tests. No model in the loop, a real Postgres database, and every case from episodes two and three.',
      'Expired and wrong-audience tokens. The audited 403. The flood that leaves the other tenant alone. Tool errors counted in the metrics. And tenant isolation, checked in the database itself, not just in the response.',
      'They run on every commit, and they must all pass. They’re deterministic, so a failure is always a real bug.',
    ],
  },
  {
    chip: '04 · Golden cases for AI clients',
    chapter: 'Golden cases for AI clients',
    terminal: { pos: 'full' },
    do: [
      { line: 0, delay: 0.1, act: 'clear' },
      { line: 0, delay: 1.0, act: 'run', cmd: `jq '.[1] | {request, seedSql, expected: .turns[0].expected, forbidden: .turns[0].forbidden}' evals/tool-tasks.json`,
        display: `jq '.[1]' evals/tool-tasks.json` },
      { line: 2, delay: 0.4, act: 'run', cmd: 'npx vitest run tests/scoring.test.ts --reporter=verbose 2>&1 | grep -E "✓|×|Tests " | sed -E "s/ [0-9]+ms$//"',
        display: 'npx vitest run tests/scoring.test.ts --reporter=verbose' },
    ],
    lines: [
      'Contract tests can’t tell you whether an AI model uses the tools well. That takes golden cases, like this one.',
      'Add Dana Kim if she’s missing, with seeded data where Dana already exists. So the expected calls are a search, and nothing else. Creating her is forbidden.',
      'The scorer that grades each run has tests of its own: right order passes, create before search fails, a forbidden call fails, one extra search is fine, a second create is not.',
    ],
  },
  evalScene,
  {
    chip: 'Summary',
    summary: true,
    char: { moods: [{ line: 0, mood: 'happy' }], pops: [{ line: 1, delay: 0.5, kind: 'say', text: 'Now I trust it, and I can prove it. 😄' }] },
    lines: [
      'Click. Script. Test. Evaluate.',
      'From a first 401 to a release gate: that’s how you get to know an MCP server, and how you keep trusting it.',
    ],
  },
];

export default {
  renderer: 'app',
  template: 'MCP Inspector CLI + acme-crm-mcp tests',
  title: { kicker: 'Hands-on MCP · Episode 4', heading: 'From Clicking to Automation', sub: 'The Inspector CLI, contract tests, and evals' },
  summary: ['Click', 'Script', 'Test', 'Evaluate'],
  character: { label: 'Becky', startMood: 'curious', look: { tag: 'Becky · trying it herself' } },
  setup: {
    tokens: { ACME: 'acme-agent' },
    servers: { 'acme-crm': { type: 'streamable-http', url: 'http://localhost:8787/mcp', headers: { Authorization: 'Bearer {{ACME}}' } } },
  },
  displayOutput: (out) => out.replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, (t) => `${t.slice(0, 28)}…${t.slice(-8)}  (${t.length} chars)`),
  speak: [[/\bMCP\b/g, 'M C P'], [/\b401\b/g, 'four oh one'], [/\b403\b/g, 'four oh three'], [/\bJSON\b/g, 'jason']],
  youtube: {
    title: 'Automating MCP Server Tests: Inspector CLI, Contract Tests, Tool-Use Evals (Hands-on MCP, Ep. 4)',
    description: `
Clicking through the MCP Inspector proves your server works once. How do you prove it before every release?

In the series finale, everything Becky checked by hand becomes automation, against the same real multi-tenant MCP server.

What you'll learn:
• The MCP Inspector's command-line mode: listing and calling tools as JSON
• A smoke test built from the Inspector CLI's exit codes (0 ok, 3 auth required, 5 tool error)
• Contract tests with no model in the loop: tokens, scopes, rate limits, and tenant isolation checked in the database
• Golden test cases for AI clients: seeded data, expected and forbidden tool calls
• Testing the eval's own scorer, and gating releases on the weakest client model`,
    tags: ['MCP', 'Model Context Protocol', 'MCP Inspector', 'MCP CLI', 'contract testing', 'smoke test', 'LLM evaluation', 'evals', 'CI', 'AI agents', 'Claude'],
  },
  scenes,
};
