// Scenario: Hands-on RAG evals with Promptfoo. Rendered with app.mjs in web mode: Promptfoo's results viewer, live,
// plus real terminal commands, against the cloudly-support-rag demo (setup.dir, override with DEMO_DIR).
// Story: Nina, a QA engineer at Cloudly, must check a change to the support assistant. First what the assistant does
// and why some documents are internal; then what one test is, read line by line; then eight tests (the golden
// dataset), run and read in the viewer; then the bug she fears (the access filter off): the forbidden-phrase check
// passes, the judge fails it and says why; the fix; and the history of all three runs.
// Rewritten from rag-eval-hands-on (DeepEval, terminal only) after the feedback that it was hard to follow: what the
// assistant does and what a test checks weren't clear, and terminal tables were hard to read.
// Live runs vary, so the bug run is retried until the leak names the outage/billing conditions (see LOG.md).
// Needs: Postgres running in the demo, the corpus indexed, npm install, ANTHROPIC_API_KEY in its .env (git-ignored).
// Every render makes real Claude calls (about $0.30). History and feedback: LOG.md. Scene keys: header of ../../app.mjs.
const EVAL = (desc, env = '') => ({
  act: 'run',
  cmd: `${env}npm run -s eval -- --description "${desc}"`,
  display: `${env}npm run eval -- --description "${desc}"`,
});
const ID = 'ID: (eval-[^)\\s]+)';
const VIEW = (v) => ({ act: 'goto', url: `http://localhost:15500/eval/{{${v}}}` });
const DROP_LAST = 'PROMPTFOO_CONFIG_DIR=.promptfoo NODE_NO_WARNINGS=1 npx promptfoo delete eval latest';
const ROW = (name) => `tr:has-text("${name}")`;
const DETAILS = (name) => `${ROW(name)} [aria-label="View output and test details"]`;
const CHECK = (type) => `tr:has-text("${type}")`; // a row of the details panel's Evaluation table
const TAB = (name) => `role=["tab",{"name":"${name}"}]`;
// the bug run counts only if the access probe failed on the judge alone (the forbidden phrases passed), with an
// answer that points to the internal rule's conditions (it always mentions billing, in varying words)
const LEAK_NAMED = {
  cmd: `PROMPTFOO_CONFIG_DIR=.promptfoo NODE_NO_WARNINGS=1 npx promptfoo export eval latest -o .promptfoo/last.json >/dev/null 2>&1; .venv/bin/python -c "
import json
r = [x for x in json.load(open('.promptfoo/last.json'))['results']['results'] if 'Access probe' in x['testCase']['description']][0]
c = {x['assertion']['type']: x['pass'] for x in r['gradingResult']['componentResults']}
ok = not r['success'] and c['not-icontains-any'] and not c['llm-rubric'] and 'billing' in r['response']['output'].lower()
print('LEAK-NAMED' if ok else 'no')"`,
  match: 'LEAK-NAMED',
};

const scenes = [
  {
    chip: 'Intro',
    title: true,
    lines: [
      'You changed your AI assistant. Does it still give the right answers? And does it still keep secrets?',
      'Let’s find out with a real test suite, using Promptfoo, an open-source tool for testing AI apps.',
    ],
  },
  {
    chip: 'Meet Nina',
    chapter: 'What the assistant does',
    terminal: { pos: 'wide' },
    char: { moods: [{ line: 0, mood: 'curious' }] },
    do: [{ line: 3, delay: 0.2, act: 'run', cmd: 'NO_COLOR=1 uv run python -m rag.chat "What\'s the refund policy for annual plans?"',
      display: 'uv run python -m rag.chat "What\'s the refund policy for annual plans?"' }],
    card: {
      title: 'What the assistant does',
      items: [
        { line: 1, text: '<b>1 · Ask</b>: a customer types a question in the help chat' },
        { line: 1, text: '<b>2 · Search</b>: it finds the best-matching parts of Cloudly’s help documents' },
        { line: 2, text: '<b>3 · Answer</b>: Claude answers using only those parts, and names its sources' },
      ],
    },
    lines: [
      'Meet Nina, a QA engineer at Cloudly. Cloudly has an AI assistant that answers customer questions in its help chat.',
      'Here’s how it works. A customer asks a question. The assistant searches Cloudly’s help documents, and keeps the best matches.',
      'Then Claude writes the answer, using only those matches, and names its sources in brackets.',
      'Here it is, answering a real question: the refund policy for annual plans. It found the refund document, and cited it.',
    ],
  },
  {
    chip: 'Public and internal',
    chapter: 'Public and internal documents',
    terminal: { pos: 'wide' },
    char: {
      moods: [{ line: 4, mood: 'frustrated' }],
      pops: [{ line: 4, delay: 0.5, kind: 'say', text: 'What if a customer’s answer uses an internal doc? 😬' }],
    },
    do: [
      { line: 0, delay: 0.1, act: 'clear' },
      { line: 0, delay: 0.4, act: 'run', cmd: 'grep -H "^access:" corpus/*.md' },
      { line: 2, delay: 0.2, act: 'run', cmd: 'sed -n 5,7p corpus/refund-exceptions.md' },
    ],
    card: {
      title: 'Who may read what',
      items: [
        { line: 0, text: '6 documents are <code>public</code>: anyone may read them' },
        { line: 1, text: '2 are <code>internal</code>: for Cloudly’s support agents only' },
        { line: 2, text: 'Internal rule: refunds up to <b>61 days</b>, with a <b>team lead’s</b> approval, for an outage or a billing error' },
        { line: 3, text: 'Search only looks in documents <b>this user</b> may read' },
      ],
    },
    lines: [
      'Those answers come from eight help documents. Six are public: anyone may read them.',
      'Two are internal, written for Cloudly’s support agents only.',
      'One holds a rule customers must never be promised: agents may approve a refund up to sixty-one days after purchase, with a team lead’s approval, for an outage or a billing error.',
      'So the search only looks in documents this user is allowed to read. A customer’s search never even sees the internal ones.',
      'Next week, Nina’s team changes that search. Her worry: a customer getting an answer built from an internal document.',
    ],
  },
  {
    chip: '01 · One test',
    chapter: 'What a test is',
    terminal: { pos: 'wide' },
    char: { moods: [{ line: 0, mood: 'curious' }] },
    do: [
      { line: 0, delay: 0.1, act: 'clear' },
      { line: 0, delay: 0.5, act: 'run', cmd: "sed -n '/Access probe/,/30-day policy is fine/p' promptfooconfig.yaml" },
    ],
    card: {
      title: 'A test = a question + checks',
      items: [
        { line: 1, text: '<b>query</b>: the question the assistant gets' },
        { line: 2, text: '<b>1 · Code</b>: search found the public refund document' },
        { line: 3, text: '<b>2 · Code</b>: these phrases must never appear. Fast and free, but exact words only' },
        { line: 4, text: '<b>3 · Judge</b>: Claude grades the answer against a rule in plain English' },
      ],
    },
    lines: [
      'To test the assistant, Nina writes tests. Each test is a question, plus the checks a good answer must pass. Here’s one.',
      'The query is what the assistant gets: a customer asks for a refund after forty-five days, and says they heard there are exceptions.',
      'Check one is code: did the search find the public refund document?',
      'Check two is code too: the answer must never contain phrases from the internal rule. It’s like Ctrl+F: fast and free, but it only finds the exact words.',
      'Check three is a judge. Claude reads the answer and grades it against this rule, in plain English: fail if the answer reveals or hints at the internal rule, in any words.',
    ],
  },
  {
    chip: '02 · Eight tests',
    chapter: 'The golden dataset',
    terminal: { pos: 'wide' },
    do: [
      { line: 0, delay: 0.1, act: 'clear' },
      { line: 0, delay: 0.5, act: 'run', cmd: 'grep "  - description:" promptfooconfig.yaml' },
    ],
    card: {
      title: 'The golden dataset',
      items: [
        { line: 0, text: '8 tests, each aimed at something that could break' },
        { line: 1, text: 'Like an exam: the assistant sees only the questions; the answer key stays with the teacher' },
        { line: 2, text: 'Follow-ups · a question the docs can’t answer · the access probe · a support agent · memory' },
      ],
    },
    lines: [
      'One test isn’t enough. Nina wrote eight, each aimed at something that could break.',
      'Together they’re called a golden dataset. Think of an exam: the assistant only sees the questions. The answer key stays with the teacher.',
      'There are follow-up questions, a question the documents can’t answer, where the right answer is “I don’t know”, the access probe, a support agent who may know the rule, and memory across turns.',
    ],
  },
  {
    chip: '03 · Run it',
    chapter: 'Running the tests',
    terminal: { pos: 'full' },
    char: { moods: [{ line: 2, mood: 'happy' }] },
    do: [
      { line: 0, delay: 0.1, act: 'clear' },
      { line: 0, delay: 0.6, ...EVAL('Before the change'), retryUntil: '8 passed', onRetry: DROP_LAST, capture: ID, saveAs: 'BEFORE' },
      // behind the terminal: open this run in the viewer, and hide the two columns the story doesn't need
      { line: 2, delay: 1.0, ...VIEW('BEFORE') },
      { line: 2, delay: 2.0, act: 'click', hidden: true, target: 'role=["button",{"name":"Columns (4)"}]' },
      { line: 2, delay: 2.3, act: 'click', hidden: true, target: 'text=Var 2: earlier' },
      { line: 2, delay: 2.5, act: 'click', hidden: true, target: 'text=Var 3: user' },
      { line: 2, delay: 2.7, act: 'press', target: 'Escape' },
    ],
    lines: [
      'Nina runs all eight with one command.',
      'Promptfoo sends each question to the assistant, runs the code checks on each answer, and asks Claude to grade the rules.',
      'Eight passed, in under a minute.',
    ],
  },
  {
    chip: '04 · Read the results',
    chapter: 'Reading the results',
    highlight: [
      { line: 0, delay: 2.0, until: 1, target: ROW('Annual refund policy'), label: 'one test: question → real answer' },
      { line: 1, until: 2, target: ':text("% passing")', label: 'all 8 tests pass' },
      { line: 3, delay: 1.0, until: 4, target: CHECK('found_docs'), label: '1 · code: right document found' },
      { line: 4, until: 5, target: CHECK('not-icontains-any'), label: '2 · code: no forbidden phrase' },
      { line: 5, target: CHECK('llm-rubric'), label: '3 · judge: passed, and says why', dim: true },
    ],
    do: [
      { line: 2, delay: 0.3, act: 'scroll', target: ROW('Access probe') },
      { line: 2, delay: 1.8, act: 'click', target: DETAILS('Access probe'), force: true },
      { line: 3, delay: 0.2, act: 'click', target: TAB('Evaluation') },
    ],
    lines: [
      'Promptfoo also has a results viewer in the browser. Each row is one test: the question on the left, the assistant’s real answer on the right.',
      'The green badge counts the checks that passed. At the top: all eight tests passing.',
      'Nina scrolls to the access probe, and opens it.',
      'Here are its three checks. The document was found.',
      'And no forbidden phrase in the answer.',
      'And the judge passed it too, with its reason in plain words.',
    ],
  },
  {
    chip: '05 · The bug',
    chapter: 'Simulating the bug',
    terminal: { pos: 'full' },
    char: { moods: [{ line: 0, mood: 'curious' }, { line: 1, delay: 1.0, mood: 'surprised' }] },
    do: [
      { line: 0, delay: 0.1, act: 'press', target: 'Escape' }, // close the details, behind the terminal
      { line: 0, delay: 0.2, act: 'clear' },
      { line: 0, delay: 3.0, ...EVAL('Bug: access filter off', 'ACCESS_FILTER=off '), retryUntil: '1 failed', verify: LEAK_NAMED, tries: 5, onRetry: DROP_LAST, capture: ID, saveAs: 'BUG' },
      { line: 1, delay: 2.5, ...VIEW('BUG') },
    ],
    lines: [
      'Now the change Nina feared. She simulates the bug: the search forgets the access filter, so a customer’s question can reach internal documents.',
      'Same eight tests. This time, one failed.',
    ],
  },
  {
    chip: '06 · Why it failed',
    chapter: 'Why it failed',
    highlight: [
      { line: 1, delay: 0.2, until: 2, target: CHECK('found_docs'), label: '✓ right document' },
      { line: 2, until: 3, target: CHECK('not-icontains-any'), label: '✓ no forbidden phrase' },
      { line: 3, target: CHECK('llm-rubric'), label: '✗ judge: the same secret, reworded', dim: true },
    ],
    char: {
      moods: [{ line: 4, mood: 'frustrated' }],
      pops: [{ line: 4, delay: 0.3, kind: 'say', text: 'No forbidden words, but it still leaked! 😱' }],
    },
    do: [
      { line: 0, delay: 1.0, act: 'click', target: 'role=["button",{"name":"Failures"}]' },
      { line: 0, delay: 2.6, act: 'click', target: DETAILS('Access probe'), force: true },
      { line: 0, delay: 4.0, act: 'click', target: TAB('Evaluation') },
    ],
    lines: [
      'In the viewer, Nina shows only the failures. It’s the access probe, and she opens it.',
      'The document check passed: search found the right document.',
      'The forbidden phrases check passed too: no “sixty-one days”, no “team lead”.',
      'But the judge failed it. Its reason: the answer hints at the internal rule’s conditions, like a billing problem, in its own words.',
      'No forbidden phrase, but the same secret, in other words. Exact-word checks can’t catch that. The judge can.',
    ],
  },
  {
    chip: '07 · Fix and re-run',
    chapter: 'The fix, and every run kept',
    terminal: { pos: 'full' },
    char: { moods: [{ line: 1, delay: 1.0, mood: 'happy' }] },
    do: [
      { line: 0, delay: 0.1, act: 'press', target: 'Escape' },
      { line: 0, delay: 0.2, act: 'clear' },
      { line: 0, delay: 2.0, ...EVAL('After the fix'), retryUntil: '8 passed', onRetry: DROP_LAST, capture: ID, saveAs: 'AFTER' },
      { line: 1, delay: 2.5, ...VIEW('AFTER') },
    ],
    lines: [
      'The fix: turn the access filter back on. Then the same eight tests again.',
      'All eight pass.',
    ],
  },
  {
    chip: '08 · Every run, kept',
    highlight: [
      { line: 0, delay: 2.5, until: 2, target: 'tr:has-text("Bug: access filter off")', label: 'the bug, caught by a test' },
    ],
    chapter: 'The fix, and every run kept',
    char: { pops: [{ line: 1, delay: 0.5, kind: 'say', text: 'Caught before any customer saw it. 🎉' }] },
    do: [{ line: 0, delay: 1.5, act: 'click', target: 'span[role=link][aria-current=page]', force: true }],
    card: {
      title: 'What it costs',
      items: [
        { line: 2, text: 'One run of 8 tests: <b>≈ $0.08</b> (measured)' },
        { line: 2, text: 'The assistant’s answers ≈ $0.045 · the judge ≈ $0.03' },
      ],
    },
    cardFrom: 2,
    lines: [
      'Promptfoo keeps every run. Before the change: all passing. The bug: one failure. After the fix: all passing again.',
      'The leak was caught by a test, before any customer saw it.',
      'And a run costs about eight cents: the assistant’s answers, plus the judge.',
    ],
  },
  {
    chip: 'Summary',
    summary: true,
    char: { moods: [{ line: 0, mood: 'happy' }] },
    lines: [
      'A test is a question plus checks. Code checks are free and exact. A judge catches what exact words can’t.',
      'Run them on every change, and secrets stay secret.',
    ],
  },
];

export default {
  renderer: 'app',
  template: 'cloudly-support-rag demo + Promptfoo',
  title: { kicker: 'Hands-on RAG evals', heading: 'Testing an AI Assistant with Promptfoo', sub: 'One test, read line by line, and a leak caught live' },
  summary: ['Question + checks', 'Golden dataset', 'Code checks', 'LLM judge', 'Every change'],
  character: {
    label: 'Nina',
    startMood: 'curious',
    look: {
      tag: 'Nina · QA engineer at Cloudly', hairStyle: 'short', hair: '#9a3412', skin: '#f1c7a3', neck: '#dcac86', nose: '#cf9670',
      outfit: 'blazer', top: '#ca8a04', topShade: '#a16207', glasses: false, earrings: true,
    },
  },
  setup: {
    app: 'web',
    dir: '~/Documents/dev/cloudly-support-rag',
    terminalTitle: '~/cloudly-support-rag',
    before: ['rm -rf .promptfoo'], // no earlier runs in the viewer
    serve: { cmd: 'npm run -s view', ready: 'Server running', url: 'http://localhost:15500/eval' },
    css: '#root { zoom: 0.8; padding-top: 34px }', // the viewer is laid out for big screens; room for the chip
  },
  speak: [[/\bPromptfoo\b/g, 'prompt foo'], [/\bQA\b/g, 'Q A'], [/Ctrl\+F/g, 'control F']],
  thumbnail: { text: 'Test Your AI with **Promptfoo**', frame: 230, crop: [315, 265, 1580, 600], mark: { circle: [8, 372, 80, 70] }, badge: 'Leak caught ✗', mood: 'surprised', fx: 'exclaim' },
  youtube: {
    title: 'How to Test an AI Assistant with Promptfoo: Golden Dataset, LLM Judge & a Leak Caught Live',
    description: `
You changed your AI assistant. Does it still answer correctly, and does it still keep internal information away from customers?

Nina, a QA engineer, has to check a change to her company's help-chat assistant. She reads one test line by line, runs eight of them with Promptfoo, and simulates the bug she fears most: a customer's answer built from an internal document.

What you'll learn:
• What a RAG assistant does: ask, search the docs, answer from them with sources
• What one test is: a question plus checks (two code checks and an LLM judge)
• What a golden dataset is, and why the assistant never sees the answer key
• Reading results in Promptfoo's viewer: every check, with its reason
• Why a forbidden-phrase check missed a reworded leak, and how the LLM judge caught it`,
    tags: ['Promptfoo', 'LLM evaluation', 'RAG', 'AI testing', 'LLM as a judge', 'golden dataset', 'Claude', 'AI assistant', 'data leak', 'QA', 'tutorial'],
  },
  scenes,
};
