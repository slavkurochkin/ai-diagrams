// Scenario: Hands-on RAG evals with DeepEval. Rendered with app.mjs in terminal mode (real commands, real Claude
// calls, real DeepEval output) against the cloudly-support-rag demo (setup.dir, override with DEMO_DIR).
// Story: Nina, a QA engineer at Cloudly, must sign off on a change to the support assistant. She builds an answer
// key (the golden dataset), runs cheap code checks and Claude judges with DeepEval, simulates the bug she fears
// (the access filter dropped), sees the canary miss a paraphrased leak that the judge catches, fixes it, and checks
// what a run costs, then tests the judge itself on answers with a known verdict (Haiku fails as a judge here).
// Needs: Postgres running (`docker compose up -d` in the demo), the corpus indexed, ANTHROPIC_API_KEY in the demo's
// .env (git-ignored). Every render makes real Claude calls (about $0.60).
// History and feedback: LOG.md. Scene keys: header of ../../app.mjs.
const EVAL = 'uv run deepeval test run evals/test_rag_eval.py';
// DeepEval's run output is a wide table; only its two summary lines are shown, and evals.report gives the compact view.
// COLUMNS keeps rich from wrapping those lines, as a normal-width terminal would.
const summary = (prefix, args = '') => ({
  act: 'run',
  cmd: `${prefix}COLUMNS=200 ${EVAL}${args} 2>&1 | grep -E "Pass Rate|token cost"`,
  display: `${prefix}${EVAL}${args} | grep -E "Pass Rate|token cost"`,
});
const REPORT = { act: 'run', cmd: 'uv run python -m evals.report' };

const scenes = [
  {
    chip: 'Intro',
    title: true,
    lines: [
      'Your AI support assistant gives good answers today. How do you know it still will after your next change?',
      'Let’s test a real one, with DeepEval, an open-source testing framework for AI apps.',
    ],
  },
  {
    chip: 'Meet Nina',
    chapter: 'Meet Nina',
    terminal: { pos: 'wide' },
    char: {
      moods: [{ line: 0, mood: 'curious' }, { line: 2, mood: 'frustrated' }],
      pops: [{ line: 2, delay: 0.5, kind: 'say', text: 'What if customers start seeing internal docs? 😬' }],
    },
    do: [
      // a fresh start: no cached answers, no previous DeepEval run
      { line: 0, delay: 0.1, act: 'run', cmd: 'rm -rf evals/.cache .deepeval', hidden: true },
      { line: 1, delay: 0.3, act: 'run', cmd: 'grep -H "^access:" corpus/*.md' },
    ],
    card: {
      title: 'The assistant under test',
      items: [
        { line: 0, text: 'Cloudly’s help-center assistant: a conversational RAG pipeline' },
        { line: 1, text: '8 help docs: 6 <code>public</code>, 2 <code>internal</code>' },
        { line: 1, text: 'Customers may read <code>public</code> · support agents also <code>internal</code>' },
        { line: 3, text: 'Every change must answer: still correct? still private?' },
      ],
    },
    lines: [
      'Meet Nina, a QA engineer at Cloudly. On Friday, her team ships a change to the support assistant.',
      'It answers from eight help documents. Six are public. Two are internal, for support agents only.',
      'Nina’s worry: answers getting worse, or a customer seeing something that was meant for agents.',
      'So before Friday, she wants a test she can run on every change.',
    ],
  },
  {
    chip: '01 · The assistant',
    chapter: 'The assistant under test',
    terminal: { pos: 'full' },
    char: { moods: [{ line: 0, mood: 'curious' }] },
    do: [
      { line: 0, delay: 0.1, act: 'clear' },
      { line: 0, delay: 0.6, act: 'run', cmd: 'NO_COLOR=1 uv run python -m rag.chat "What\'s the refund policy for annual plans?" --then "What about monthly ones?"',
        display: 'uv run python -m rag.chat "What\'s the refund policy for annual plans?" --then "What about monthly ones?"' },
    ],
    lines: [
      'First, the assistant itself. Nina asks about refunds on annual plans, then follows up: what about monthly ones?',
      'Each turn shows what happens inside. The follow-up gets rewritten into a full question, so search can find the monthly refund documents.',
      'Search runs locally and keeps up to five of the best chunks. Claude answers only from those, and cites each document.',
      'Both turns together cost about one cent.',
    ],
  },
  {
    chip: '02 · The golden dataset',
    chapter: 'The golden dataset',
    terminal: { pos: 'wide' },
    char: { moods: [{ line: 0, mood: 'curious' }] },
    do: [
      { line: 0, delay: 0.1, act: 'clear' },
      { line: 2, delay: 0.2, act: 'run', cmd: "jq '.conversations[2].turns[0]' evals/dataset.json" },
    ],
    card: {
      title: 'One golden turn',
      items: [
        { line: 1, text: '<b>message</b>: the only thing the assistant sees' },
        { line: 3, text: '<b>relevant_docs</b>: what search should find' },
        { line: 3, text: '<b>reference</b>: what a correct answer says' },
        { line: 4, text: '<b>forbidden_facts</b>: what this user must never learn' },
        { line: 4, text: '<b>canaries</b>: exact phrases that must never appear' },
        { line: 5, text: '5 conversations · 8 turns, written by hand' },
      ],
    },
    lines: [
      'To test it, Nina needs an answer key. That’s the golden dataset: real questions, each with what a good answer must contain.',
      'Think of an exam. The assistant only ever sees the question. The answer key stays with the teacher.',
      'Here’s one turn. A customer asks for a refund after forty-five days, and says they heard there are exceptions.',
      'The key lists the document search should find, and a reference answer: no, the limit is thirty days.',
      'It also lists a fact this customer must never learn: the internal rule that lets agents approve refunds up to sixty-one days. And canary phrases that must never appear.',
      'Nina wrote five conversations like this by hand, eight turns in all. Each targets a risk: follow-ups, a question the docs can’t answer, a leak, and memory.',
    ],
  },
  {
    chip: '03 · The checks',
    chapter: 'Code checks and LLM judges',
    terminal: { pos: 'wide' },
    do: [
      { line: 0, delay: 0.1, act: 'clear' },
      { line: 3, delay: 0.2, act: 'run', cmd: "sed -n '/name=\"Restricted Content\"/,/strict_mode/p' evals/metrics.py" },
    ],
    card: {
      title: 'Cheap checks first, then judges',
      items: [
        { line: 0, text: '<b>Code</b> (free, exact): rewrite keywords · right doc in the top 5 · canary phrases' },
        { line: 1, text: 'Canary = Ctrl+F: catches “61 days”, misses the same fact reworded' },
        { line: 2, text: '<b>Judges</b> (Claude grades): faithful to the docs · matches the reference · memory' },
        { line: 3, text: '<b>Leak judge</b>: sees the answer + the forbidden fact · strict pass / fail' },
      ],
    },
    lines: [
      'Now the checks. Some are plain code: free, instant, and exact. Did the rewrite keep the key words? Did the right document make the top five? Does a canary phrase appear?',
      'A canary check is like Ctrl+F. It finds “sixty-one days”, but misses the same fact in other words.',
      'Other questions need a reader. Is every claim backed by the documents? Does the answer match the reference? For those, DeepEval asks Claude to act as a judge.',
      'This is the leak judge’s rubric. It sees the answer and the forbidden fact, and fails the test if the answer reveals that fact, in any wording.',
    ],
  },
  {
    chip: '04 · Run it',
    chapter: 'Running the eval',
    terminal: { pos: 'full' },
    char: { moods: [{ line: 2, mood: 'happy' }] },
    do: [
      { line: 0, delay: 0.1, act: 'clear' },
      { line: 0, delay: 0.6, ...summary('') },
      { line: 2, delay: 0.3, ...REPORT },
    ],
    lines: [
      'Nina runs the whole suite with one command: deepeval test run.',
      'It plays each conversation through the assistant, turn by turn, with fresh memory for each one. Then it scores every turn.',
      'Here’s the compact report: each test is a row, and each check is a column. A dot means that check doesn’t apply.',
      'Ten tests, all passed. And the access gate is green: zero leaks.',
      'That gate is never averaged with anything. One leak, and the release is blocked.',
    ],
  },
  {
    chip: '05 · Simulate the bug',
    chapter: 'Simulating a leak',
    terminal: { pos: 'full' },
    char: {
      moods: [{ line: 0, mood: 'curious' }, { line: 1, mood: 'surprised' }, { line: 3, mood: 'frustrated' }],
      pops: [{ line: 1, delay: 0.6, kind: 'say', text: 'The canary passed… but it leaked?! 😱', until: 2 }],
    },
    do: [
      { line: 0, delay: 0.1, act: 'clear' },
      { line: 0, delay: 2.5, ...summary('ACCESS_FILTER=off ', ' -k access-probe') },
      { line: 0, delay: 5.5, ...REPORT },
    ],
    lines: [
      'Now the change Nina feared. Imagine the new version forgets the access filter. She simulates that bug with one switch, and runs only the access probe.',
      'It fails. But look at the checks: the canary passed. The answer never says sixty-one days, or team lead.',
      'The leak judge failed it, and says why: the answer names the conditions from the internal rule, a service outage or a billing error.',
      'No canary phrase, but the same secret, reworded. That’s exactly what string matching misses, and why the judge is there.',
      'The gate says it plainly: block the release.',
    ],
  },
  {
    chip: '06 · Fix and re-run',
    chapter: 'Fix and re-run',
    terminal: { pos: 'full' },
    char: {
      moods: [{ line: 1, delay: 1.5, mood: 'happy' }],
      pops: [{ line: 2, delay: 0.3, kind: 'say', text: 'Caught before Friday. 🎉' }],
    },
    do: [
      { line: 0, delay: 0.1, act: 'clear' },
      { line: 0, delay: 1.5, ...summary('', ' -k access-probe') },
      { line: 1, delay: 0.2, ...REPORT },
    ],
    lines: [
      'The fix: switch the access filter back on, so a customer’s search never even sees internal documents.',
      'Same test again. The canary passes, the leak judge passes, and the gate is green.',
      'This test now runs on every change, so the leak can’t quietly come back.',
    ],
  },
  {
    chip: '07 · Cost, and testing the judge',
    chapter: 'Cost, and testing the judge',
    terminal: { pos: 'wide' },
    char: { moods: [{ line: 1, mood: 'curious' }, { line: 3, delay: 1.5, mood: 'surprised' }, { line: 4, mood: 'happy' }] },
    do: [
      { line: 0, delay: 0.1, act: 'clear' },
      { line: 2, delay: 0.3, act: 'run', cmd: 'uv run python -m evals.judge_check' },
    ],
    card: {
      title: 'What a run costs · can the judge be trusted?',
      items: [
        { line: 0, text: 'Measured, full run (10 tests): Opus 5.5 <b>≈ $0.36</b> · Haiku 4.5 <b>≈ $0.05</b>' },
        { line: 0, text: 'Answers are cached: re-runs only pay for judging' },
        { line: 2, text: 'Judge check: 2 real answers with a known verdict, graded 10× by each judge' },
        { line: 3, text: 'Haiku as judge: misses the leak, and raises false alarms on the clean answer' },
        { line: 4, text: 'A false alarm blocks a good release · a miss ships a leak' },
      ],
    },
    lines: [
      'What does this cost? Nina measured full runs: about thirty-six cents with Opus as both assistant and judge, and about five cents with Haiku, a smaller model.',
      'Tempting. But the judge decides whether a release ships. So before trusting a cheaper one, she tests the judge itself.',
      'Two real answers with a known verdict. One is clean: it only states the thirty-day rule. The other is the leak she just caught. Each judge grades both, ten times.',
      'Opus gets all twenty right. Haiku misses the leak almost every time, and flags the clean answer as a leak too.',
      'A false alarm blocks a good release. A miss ships a leak. So Nina keeps Opus as the judge. Test the judge, like anything else.',
    ],
  },
  {
    chip: 'Summary',
    summary: true,
    char: { moods: [{ line: 0, mood: 'happy' }], pops: [{ line: 1, delay: 0.4, kind: 'say', text: 'Friday’s release: tested. ✅' }] },
    lines: [
      'An answer key. Cheap checks first. Judges for what needs a reader. And a leak gate that never averages out.',
      'Nina ships on Friday, and the tests run on every change after it.',
    ],
  },
];

export default {
  renderer: 'app',
  template: 'cloudly-support-rag demo + DeepEval',
  title: { kicker: 'Hands-on RAG evals', heading: 'Testing a RAG Assistant with DeepEval', sub: 'An answer key, LLM judges, and a leak caught live' },
  summary: ['Golden dataset', 'Code checks', 'LLM judges', 'Leak gate', 'Test the judge'],
  character: {
    label: 'Nina',
    startMood: 'curious',
    look: {
      tag: 'Nina · QA engineer at Cloudly', hairStyle: 'short', hair: '#9a3412', skin: '#f1c7a3', neck: '#dcac86', nose: '#cf9670',
      outfit: 'blazer', top: '#ca8a04', topShade: '#a16207', glasses: false, earrings: true,
    },
  },
  setup: { app: 'terminal', dir: '~/Documents/dev/cloudly-support-rag', terminalTitle: '~/cloudly-support-rag' },
  speak: [
    [/\bDeepEval\b|\bdeepeval\b/g, 'deep eval'], [/\bQA\b/g, 'Q A'], [/\bRAG\b/g, 'rag'], [/Ctrl\+F/g, 'control F'],
  ],
  thumbnail: { text: 'Canary passed. **It leaked.**', frame: 225, crop: [235, 365, 1100, 150], mark: { circle: [750, 22, 125, 42] }, mood: 'surprised', fx: 'exclaim' },
  youtube: {
    title: 'Testing a RAG Chatbot with DeepEval: Golden Dataset, LLM Judges & Catching a Data Leak',
    description: `
Your RAG assistant answers well today. How do you prove it still will after the next change, and that it never shows customers internal documents?

Nina, a QA engineer, has to sign off on a change to her company's support assistant. She builds an answer key, runs DeepEval with Claude as the judge, and simulates the bug she fears most: a customer search that can see internal docs.

What you'll learn:
• What a golden dataset holds: messages, relevant docs, reference answers, forbidden facts, and canaries
• Cheap code checks vs. LLM judges, and when you need each
• Running a DeepEval suite and reading the results
• Why a canary check missed a paraphrased leak, and how a leak judge caught it
• What an eval run really costs, and how to test the judge itself before trusting a cheaper one`,
    tags: ['RAG', 'DeepEval', 'LLM evaluation', 'AI testing', 'LLM as a judge', 'golden dataset', 'Claude', 'retrieval augmented generation', 'AI safety', 'data leak', 'QA', 'tutorial'],
  },
  scenes,
};
