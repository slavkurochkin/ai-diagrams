// Scenario: Hands-on MCP, episode 5: A real AI client. Rendered with app.mjs (real terminal, real Claude).
// Story: full circle. The request Becky gave her assistant in the very first video ("add Dana Kim if she's
// not in the CRM") now runs for real: Claude, connected over MCP to the server Becky tested, with live tool
// calls. Then the same request again (no duplicate), a destructive request (it asks first), and the audit log.
// The model's exact wording varies run to run, so the narration describes the pattern; every still is
// checked against what the model actually did. Needs ANTHROPIC_API_KEY in the demo project's .env.
// History and feedback: LOG.md. Scene keys: see the header of ../../app.mjs.
const ADD = 'Add Dana Kim from Northwind (dana@northwind.example) to our CRM if she’s not already there.';
const agent = (args) => `npm run -s agent -- ${args}`;
const q = (s) => `"${s.replace(/’/g, "'")}"`;

const scenes = [
  {
    chip: 'Intro',
    title: true,
    lines: [
      'Hands-on MCP, episode five: a real AI client.',
      'Becky has tested the server every way she could. Now it’s time to hand it to an AI.',
    ],
  },
  {
    chip: 'Full circle',
    chapter: 'Full circle',
    cardPos: 'bottomleft',
    card: {
      title: 'How an AI client connects',
      items: [
        { line: 1, text: 'Token from the authorization server, as client <code>acme-agent</code>' },
        { line: 1, text: 'MCP connection with <code>Authorization: Bearer …</code>' },
        { line: 2, text: '<code>tools/list</code> → the tools Claude may use, with their descriptions' },
        { line: 2, text: 'Claude asks for a call → the client runs it over MCP → the result goes back' },
      ],
    },
    char: {
      moods: [{ line: 0, mood: 'happy' }],
      pops: [{ line: 0, delay: 1.0, kind: 'say', text: 'My actual assistant, on the real server! 🤩' }],
    },
    lines: [
      'In the very first video, Becky asked her assistant: add Dana Kim, if she’s not in the CRM. Today, that request runs for real.',
      'The AI client is small. It gets a token from the authorization server, like the Inspector did, and connects over MCP with it.',
      'It hands the server’s tools to Claude. Whenever Claude asks for a tool call, the client runs it on the server, and sends the result back.',
    ],
  },
  {
    chip: '01 · Add Dana, if she’s missing',
    chapter: 'Add Dana, if she’s missing',
    terminal: { pos: 'full' },
    char: { moods: [{ line: 2, mood: 'happy' }] },
    do: [{ line: 0, delay: 0.6, act: 'run', cmd: agent(q(ADD)), display: `npm run agent -- ${q(ADD)}` }],
    lines: [
      'Becky’s request goes to Claude, exactly as she’d type it.',
      'Watch the order of the calls. Claude searches first. Acme has no Dana Kim, because the Dana we saw belongs to Globex, and Acme’s token can’t see her.',
      'Only after the searches come up empty does it create her, once. That’s the order the tool descriptions asked for.',
    ],
  },
  {
    chip: '02 · The same request, again',
    chapter: 'The same request, again',
    terminal: { pos: 'full' },
    do: [
      { line: 0, delay: 0.1, act: 'clear' },
      { line: 0, delay: 0.6, act: 'run', cmd: agent(q(ADD)), display: `npm run agent -- ${q(ADD)}` },
    ],
    lines: [
      'Now the same request again. This time, Dana is already in Acme’s CRM.',
      'Claude searches, finds her, and stops. No second Dana, no duplicate. It’s the same request with different data, the case the golden tests were built for.',
    ],
  },
  {
    chip: '03 · A destructive request',
    chapter: 'A destructive request',
    terminal: { pos: 'full' },
    char: { moods: [{ line: 1, mood: 'curious' }, { line: 2, delay: 1.0, mood: 'happy' }] },
    do: [
      { line: 0, delay: 0.1, act: 'clear' },
      { line: 0, delay: 0.6, act: 'run', cmd: agent(`"Delete Dana Kim from our CRM." --then "Yes, delete her."`),
        display: 'npm run agent -- "Delete Dana Kim from our CRM." --then "Yes, delete her."' },
    ],
    lines: [
      'Then a dangerous one: delete Dana Kim. The delete tool is marked destructive, and its description says to confirm with the user first.',
      'Claude finds her, and asks before doing anything permanent.',
      'Only after Becky says yes does it delete, by her exact ID.',
    ],
  },
  {
    chip: '04 · Checking the AI’s work',
    chapter: 'Checking the AI’s work',
    terminal: { pos: 'full' },
    do: [
      { line: 0, delay: 0.1, act: 'clear' },
      { line: 0, delay: 0.6, act: 'run', cmd: `docker compose exec -T db psql -U postgres -d crm -c "select at::time(0), tenant_id, client_id, tool, arguments, outcome from audit_log"` },
      { line: 1, delay: 0.4, act: 'run', cmd: `docker compose exec -T db psql -U postgres -d crm -c "select id, tenant_id, name from contacts where name = 'Dana Kim'"` },
    ],
    lines: [
      'Every write the AI made is in the audit log: the create, and the delete, with their arguments, under Acme’s client.',
      'And Globex’s Dana Kim is exactly where she was. The AI worked only inside Acme’s data, because that’s all its token could ever see.',
    ],
  },
  {
    chip: 'Summary',
    summary: true,
    char: { moods: [{ line: 0, mood: 'happy' }], pops: [{ line: 1, delay: 0.5, kind: 'say', text: 'From a diagram to my real assistant. 🎉' }] },
    lines: [
      'Search first. Ask before deleting. Stay in your tenant. Audit everything.',
      'That’s an MCP server an AI can use safely, and the end of Becky’s journey: from a diagram, to a real assistant.',
    ],
  },
];

export default {
  renderer: 'app',
  template: 'acme-crm-mcp demo server + a Claude-powered MCP client',
  title: { kicker: 'Hands-on MCP · Episode 5', heading: 'A Real AI Client', sub: 'Claude meets the server Becky tested' },
  summary: ['Search first', 'Ask before deleting', 'Stay in your tenant', 'Audit everything'],
  character: { label: 'Becky', startMood: 'happy', look: { tag: 'Becky · trying it herself' } },
  setup: { servers: {} },
  speak: [[/\bMCP\b/g, 'M C P'], [/\bID\b/g, 'I D'], [/\bCRM\b/g, 'C R M']],
  thumbnail: { text: 'Will Claude **delete** it?', frame: 90, crop: [235, 425, 1110, 215], mark: { circle: [5, 135, 1095, 30] }, badge: 'Asks first ✓', mood: 'surprised', pose: 'hands-on-head', fx: 'exclaim' },
  youtube: {
    title: 'Claude Meets a Real MCP Server: Search First, Ask Before Deleting (Hands-on MCP, Ep. 5)',
    description: `
What does an AI model actually do with your MCP server's tools when you give it a real request?

The series finale comes full circle: the request Becky gave her AI assistant in the very first architecture video now runs for real, with Claude connected over MCP to the multi-tenant server she tested.

What you'll learn:
• How a minimal AI client connects to an MCP server: token, MCP connection, tools handed to the model
• Watching real tool calls: searching before creating, and not creating duplicates
• Destructive tools: why the model asks before deleting, and deletes by exact ID after consent
• Tenant isolation from the AI's side: it can only ever see its own tenant's data
• Checking the AI's work in the audit log`,
    tags: ['MCP', 'Model Context Protocol', 'Claude', 'AI agents', 'tool use', 'MCP client', 'multi-tenant', 'AI safety', 'audit log', 'Anthropic', 'tutorial'],
  },
  scenes,
};
