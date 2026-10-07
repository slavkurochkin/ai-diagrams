// Scenario: Run AI tests on every pull request (Hands-on RAG evals, episode 2). Rendered with app.mjs in web mode:
// Promptfoo's viewer showing results downloaded from real GitHub Actions runs, plus real git/gh commands, against
// the cloudly-support-rag demo (setup.dir, override with DEMO_DIR).
// Story: Nina's eight Promptfoo tests only help when someone runs them, so she puts them in CI. A teammate's
// "Faster search" pull request quietly drops the access filter; CI goes red; the CI results, opened in the viewer,
// show a new code check failing (the customer's search returned internal chunks) even where the answer looked fine;
// the fix turns the check green; branch protection would lock the merge.
// Everything shown already happened: PR #1 in the demo repo, its red run and its green run. setup.before downloads
// those two runs' results and imports them, so a render makes no Claude calls and changes nothing on GitHub.
// History and feedback: LOG.md. Scene keys: header of ../../app.mjs.
const RED_RUN = '37630702650'; // "Faster search" commit: eval failed (3 of 8)
const GREEN_RUN = '37631102907'; // the fix: eval passed (8 of 8)
const RED_EVAL = 'eval-gvG-2026-10-07T13:44:02';
const GREEN_EVAL = 'eval-TBp-2026-10-07T13:47:06';
const BUG_COMMIT = 'b3d071d';
const FIX_COMMIT = '80482b9';
const PF = 'PROMPTFOO_CONFIG_DIR=.promptfoo-ci PROMPTFOO_DISABLE_TELEMETRY=1 NODE_NO_WARNINGS=1';
const DIFF = (sha) => ({ act: 'run', cmd: `git show ${sha} -- rag/store.py | sed -n '/^@@/,$p'`, display: `git show ${sha} -- rag/store.py` });
const VIEW = (id) => ({ act: 'goto', url: `http://localhost:15500/eval/${id}` });
const ROW = (name) => `tr:has-text("${name}")`;
const DETAILS = (name) => `${ROW(name)} [aria-label="View output and test details"]`;
const CHECK = (text) => `tr:has-text("${text}")`; // a row of the details panel's Evaluation table
const TAB = (name) => `role=["tab",{"name":"${name}"}]`;

const scenes = [
  {
    chip: 'Intro',
    title: true,
    lines: [
      'Last time, Nina ran eight tests on her AI assistant by hand. But a test that someone has to remember to run, sooner or later, doesn’t run.',
      'Today: running them automatically, on every pull request.',
    ],
  },
  {
    chip: 'Nina is back',
    chapter: 'Why run tests in CI',
    char: {
      moods: [{ line: 0, mood: 'curious' }, { line: 2, mood: 'happy' }],
      pops: [{ line: 1, delay: 0.5, kind: 'say', text: 'My tests only help if someone runs them… 🤔', until: 2 }],
    },
    card: {
      title: 'Tests that run themselves',
      items: [
        { line: 0, text: 'The assistant answers from help docs; <b>internal</b> docs must never reach customers' },
        { line: 1, text: '8 Promptfoo tests check that, but only when someone runs them' },
        { line: 2, text: '<b>CI</b> (continuous integration): checks that run automatically, like a smoke detector' },
        { line: 3, text: '<b>Pull request</b>: a proposed code change, checked before it’s merged' },
      ],
    },
    lines: [
      'Quick recap. Cloudly’s help-chat assistant answers from help documents. Some are internal, and customers must never get answers built from them.',
      'Nina has eight tests for that, in Promptfoo. They catch problems, but only when someone remembers to run them.',
      'So she puts them in CI, short for continuous integration. Think of a smoke detector: nobody presses a button. It checks all the time, and beeps when something’s wrong.',
      'With CI, every pull request, every proposed code change, runs the tests automatically before anyone merges it.',
    ],
  },
  {
    chip: '01 · The workflow',
    chapter: 'The GitHub Actions workflow',
    terminal: { pos: 'wide' },
    do: [{ line: 0, delay: 0.6, act: 'run', cmd: 'grep -nE "^      - (name|run|uses)" .github/workflows/ai-eval.yml' }],
    card: {
      title: 'One file: .github/workflows/ai-eval.yml',
      items: [
        { line: 1, text: 'Fresh database, install, index the help docs, like on Nina’s laptop' },
        { line: 2, text: 'Run the same 8 tests · <b>any failed test fails the check</b>' },
        { line: 3, text: 'Save the results · post a summary on the pull request' },
        { line: 4, text: 'The API key is a GitHub <b>secret</b>, never in the code' },
      ],
    },
    lines: [
      'The setup is one file in the repository: a GitHub Actions workflow. These are its steps.',
      'It starts a fresh database, installs the assistant and Promptfoo, and indexes the help documents, just like on Nina’s laptop.',
      'Then it runs the same eight tests. If any test fails, the whole check fails.',
      'It also saves the results, and posts a summary on the pull request.',
      'The Anthropic API key is stored as an encrypted GitHub secret. It’s never in the code.',
    ],
  },
  {
    chip: '02 · A check for CI',
    chapter: 'A check you can gate on',
    terminal: { pos: 'wide' },
    do: [
      { line: 0, delay: 0.1, act: 'clear' },
      { line: 2, delay: 0.2, act: 'run', cmd: "sed -n '/^def no_internal_docs/,$p' evals/promptfoo/checks.py" },
    ],
    card: {
      title: 'Look one step earlier',
      items: [
        { line: 1, text: 'The judge only sees the <b>answer</b>; a leaky search can still produce a clean-looking answer' },
        { line: 2, text: 'This check sees what the <b>search returned</b>' },
        { line: 3, text: 'Plain code: exact, free, the same every run · on all 8 tests' },
      ],
    },
    lines: [
      'Before CI, Nina added one more check.',
      'The judge only reads the answer. And when the search goes wrong, the answer can still look harmless.',
      'This check looks one step earlier: at what the search returned. If a customer’s search returns any internal document, the test fails.',
      'It’s plain code: exact, free, and the same every run. And it runs on all eight tests.',
    ],
  },
  {
    chip: '03 · The pull request',
    chapter: 'A pull request with a hidden bug',
    terminal: { pos: 'full' },
    char: { moods: [{ line: 0, mood: 'curious' }] },
    do: [
      { line: 0, delay: 0.1, act: 'clear' },
      { line: 0, delay: 2.5, ...DIFF(BUG_COMMIT) },
    ],
    lines: [
      'Then a teammate opens a pull request: Faster search. Simplify the query, so the vector index can do its job.',
      'Here’s the change. The new query is shorter. And the line that kept customers away from internal documents, the access-group condition, is gone.',
      'In a code review, this is easy to miss. It looks like a cleanup.',
    ],
  },
  {
    chip: '04 · CI goes red',
    chapter: 'CI goes red',
    terminal: { pos: 'full' },
    char: { moods: [{ line: 0, delay: 2.5, mood: 'surprised' }] },
    do: [
      { line: 0, delay: 0.1, act: 'clear' },
      { line: 0, delay: 0.6, act: 'run', cmd: `NO_COLOR=1 gh run view ${RED_RUN} | head -16`, display: `gh run view ${RED_RUN} | head -16` },
      // behind the terminal: open the red run in the viewer, and hide the two columns the story doesn't need
      { line: 1, delay: 0.5, ...VIEW(RED_EVAL) },
      { line: 1, delay: 1.5, act: 'click', hidden: true, target: 'role=["button",{"name":"Columns (4)"}]' },
      { line: 1, delay: 1.8, act: 'click', hidden: true, target: 'text=Var 2: earlier' },
      { line: 1, delay: 2.0, act: 'click', hidden: true, target: 'text=Var 3: user' },
      { line: 1, delay: 2.2, act: 'press', target: 'Escape' },
    ],
    lines: [
      'CI runs on its own. Two minutes later, the check is red.',
      'Setup and indexing passed. The step that failed is the eval: some of the tests failed.',
    ],
  },
  {
    chip: '05 · Which tests, and why',
    chapter: 'Reading the CI results',
    char: {
      moods: [{ line: 3, mood: 'frustrated' }],
      pops: [{ line: 3, delay: 0.5, kind: 'say', text: 'Even the harmless-looking answers! 😱' }],
    },
    highlight: [
      { line: 0, delay: 1.5, until: 1, target: ':text("% passing")', label: '3 of 8 tests failed' },
      { line: 2, delay: 0.8, until: 3, target: CHECK('no_internal_docs'), label: '✗ search returned internal chunks', dim: true },
      { line: 3, target: CHECK('llm-rubric'), label: '✓ the answer itself passed' },
    ],
    do: [
      { line: 0, delay: 3.0, act: 'click', target: 'role=["button",{"name":"Failures"}]' },
      { line: 1, delay: 0.3, act: 'click', target: DETAILS('Annual refund policy'), force: true },
      { line: 1, delay: 1.8, act: 'click', target: TAB('Evaluation') },
    ],
    lines: [
      'CI saved the results, so Nina opens them in Promptfoo’s viewer. Three of the eight tests failed.',
      'She opens the first one: an ordinary question about annual refunds.',
      'The new check failed. The customer’s search returned internal chunks, from the refund-exceptions document.',
      'And the answer itself passed its judge: it happened to look fine. Without the search check, this test would have passed.',
    ],
  },
  {
    chip: '06 · The fix',
    chapter: 'The fix goes green',
    terminal: { pos: 'full' },
    char: { moods: [{ line: 1, delay: 1.0, mood: 'happy' }] },
    do: [
      { line: 0, delay: 0.1, act: 'press', target: 'Escape' }, // close the details, behind the terminal
      { line: 0, delay: 0.2, act: 'clear' },
      { line: 0, delay: 0.8, ...DIFF(FIX_COMMIT) },
      { line: 1, delay: 0.3, act: 'run', cmd: 'gh pr checks 1' },
      { line: 2, delay: 0.5, ...VIEW(GREEN_EVAL) },
    ],
    lines: [
      'The fix: put the access-group condition back in the query.',
      'The new commit runs CI again. This time the check passes.',
      'All eight tests, green. Now the pull request is safe to merge.',
    ],
  },
  {
    chip: '07 · Lock the merge',
    chapter: 'Make the check required',
    char: { pops: [{ line: 1, delay: 0.5, kind: 'say', text: 'Caught before it was merged. 🎉' }] },
    highlight: [{ line: 0, delay: 0.5, until: 1, target: ':text("% passing")', label: 'the fix: all 8 pass' }],
    card: {
      title: 'Make it a real gate',
      items: [
        { line: 1, text: 'Branch protection → <b>require</b> the AI eval check: no green, no merge' },
        { line: 2, text: 'Needs a public repo or a paid GitHub plan; here the check warns but can’t lock' },
        { line: 3, text: 'Each run: about 2 minutes, about $0.08' },
      ],
    },
    lines: [
      'The bug was caught before it was merged. No customer ever saw it.',
      'One setting makes this a real gate. In GitHub’s branch protection, mark this check as required. Then the merge button stays locked until it’s green.',
      'That needs a public repository or a paid GitHub plan. On this demo, the red check warns, but can’t lock the merge.',
      'Each run takes about two minutes, and costs about eight cents.',
    ],
  },
  {
    chip: 'Summary',
    summary: true,
    char: {
      moods: [{ line: 0, mood: 'happy' }],
      pops: [{ line: 2, delay: 0.3, kind: 'say', text: 'Like & subscribe for the next one! 👍' }],
    },
    lines: [
      'Tests in CI run on every change. A code check that looks at the search catches what an answer judge can miss. And a required check keeps the merge locked until it’s green.',
      'That’s how a leak gets caught in review, not by a customer.',
      'If this helped, give it a like, and subscribe. Next up: red-teaming, where Promptfoo tries to trick the assistant into leaking.',
    ],
  },
];

export default {
  renderer: 'app',
  template: 'cloudly-support-rag demo + Promptfoo + GitHub Actions',
  title: { kicker: 'Hands-on RAG evals · 2', heading: 'Run AI Tests on Every Pull Request', sub: 'Promptfoo + GitHub Actions catch a leak before it’s merged' },
  summary: ['Tests in CI', 'Every pull request', 'Search check', 'Required check'],
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
    // the results of the two real CI runs, downloaded and imported into a viewer of their own
    before: [
      'rm -rf .promptfoo-ci && mkdir -p .promptfoo-ci/red .promptfoo-ci/green',
      `gh run download ${RED_RUN} -n eval-results -D .promptfoo-ci/red`,
      `gh run download ${GREEN_RUN} -n eval-results -D .promptfoo-ci/green`,
      `${PF} npx promptfoo import .promptfoo-ci/red/results.json`,
      `${PF} npx promptfoo import .promptfoo-ci/green/results.json`,
    ],
    serve: {
      cmd: 'npx promptfoo view --yes --port 15500',
      env: { PROMPTFOO_CONFIG_DIR: '.promptfoo-ci', PROMPTFOO_DISABLE_TELEMETRY: '1', NODE_NO_WARNINGS: '1' },
      ready: 'Server running',
      url: 'http://localhost:15500/eval',
    },
    css: '#root { zoom: 0.8; padding-top: 34px }',
  },
  speak: [[/\bPromptfoo\b/g, 'prompt foo'], [/\bQA\b/g, 'Q A'], [/\bCI\b/g, 'C I'], [/\bAPI\b/g, 'A P I']],
  thumbnail: { text: 'AI Tests in CI with **Promptfoo**', frame: 157, crop: [300, 180, 1610, 420], mark: { circle: [12, 78, 80, 62] }, badge: 'CI caught it ✗', mood: 'surprised', fx: 'exclaim' },
  youtube: {
    title: 'Run AI Tests on Every Pull Request: Promptfoo + GitHub Actions Catch a RAG Data Leak',
    description: `
Your AI tests only help if someone runs them. How do you run them on every pull request, and stop a bad change before it's merged?

Nina puts her Promptfoo tests into GitHub Actions. Then a teammate's harmless-looking "Faster search" pull request quietly removes the access filter, and CI catches it.

What you'll learn:
• What CI and pull-request checks are, in plain words
• A GitHub Actions workflow that runs a Promptfoo eval on every pull request
• Why a CI gate needs a deterministic check, not only an LLM judge
• Reading CI results in Promptfoo's viewer
• Making the check required, so the merge stays locked until it's green

If this helped, like and subscribe. Next up: red-teaming the assistant with Promptfoo.`,
    tags: ['Promptfoo', 'GitHub Actions', 'CI/CD', 'LLM evaluation', 'AI testing', 'RAG', 'pull request', 'LLM as a judge', 'Claude', 'data leak', 'QA', 'tutorial'],
  },
  scenes,
};
