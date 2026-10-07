// Scenario: Which Claude model? (Hands-on RAG evals, episode 4). Rendered with app.mjs in web mode: Promptfoo's
// viewer showing two recorded runs side by side, plus a real terminal command, on the cloudly-support-rag demo.
// Story: the assistant runs on Opus 5.5, the biggest model. Is a smaller one good enough? Nina doesn't guess: the same
// 8 tests, with the assistant on Opus 5.5, Sonnet 5.5 and Haiku 4.5, graded by the same Opus judge. All three pass
// (twice); Haiku costs about a sixth and answers three times faster. The red-team attacks hold on all three too. Her
// recommendation: Haiku, with the caveat that the decision is only as good as the tests behind it.
// The runs are recorded in the demo (evals/compare-runs/*.json; Opus vs the attacks is episode 3's run 2). A render
// makes no Claude calls. History and feedback: LOG.md. Scene keys: header of ../../app.mjs.
const RUN_MODELS = 'eval-wPi-2026-10-07T16:07:48'; // 8 tests × 3 models: 24/24
const RUN_REDTEAM = 'eval-A5H-2026-10-07T16:26:49'; // 18 attacks × Sonnet, Haiku: 36/36
const PF = 'PROMPTFOO_CONFIG_DIR=.promptfoo-cmp PROMPTFOO_DISABLE_TELEMETRY=1 NODE_NO_WARNINGS=1';
const VIEW = (id) => ({ act: 'goto', url: `http://localhost:15500/eval/${id}` });
const HEAD = (label) => `th:has-text("${label}")`; // a model's column header: pass rate, cost, latency
const ROW = (text) => `tr:has-text("${text}")`;

const scenes = [
  {
    chip: 'Intro',
    title: true,
    lines: [
      'Bigger AI models cost more, and answer slower. But is a smaller one good enough for your app?',
      'Don’t guess. Run the same tests on each model, side by side, and let the results decide.',
    ],
  },
  {
    chip: 'The question',
    chapter: 'Big model or small model?',
    char: {
      moods: [{ line: 0, mood: 'curious' }, { line: 3, mood: 'happy' }],
      pops: [{ line: 1, delay: 0.5, kind: 'say', text: 'Do we really need the biggest model? 🤔', until: 3 }],
    },
    card: {
      title: 'Three Claude models',
      items: [
        { line: 0, text: '<b>Opus 5.5</b>: the biggest, what the assistant uses today' },
        { line: 1, text: '<b>Sonnet 5.5</b>: mid-size · <b>Haiku 4.5</b>: the smallest, cheapest and fastest' },
        { line: 2, text: 'Like test-driving cars: same road, same checks, for each one' },
        { line: 3, text: 'The tests Nina already has: 8 golden tests, 18 red-team attacks' },
      ],
    },
    lines: [
      'Nina’s help-chat assistant runs on Claude Opus 5.5, the biggest model. Every answer costs money, and takes time.',
      'Claude comes in smaller sizes too. Sonnet is mid-size. Haiku is the smallest: the cheapest, and the fastest.',
      'Would a smaller model be good enough? Instead of guessing, Nina test-drives all three on the same road.',
      'And she already has the road: the eight golden tests, and the eighteen red-team attacks from the last video.',
    ],
  },
  {
    chip: '01 · The setup',
    chapter: 'Setting up the comparison',
    terminal: { pos: 'wide' },
    do: [{ line: 0, delay: 0.6, act: 'run', cmd: "sed -n '/^providers:/,/^defaultTest/p' compare.yaml | sed '$d'" }],
    card: {
      title: 'compare.yaml',
      items: [
        { line: 0, text: 'Three <b>providers</b>: the same assistant, a different model each' },
        { line: 1, text: 'The same 8 tests, from one shared file' },
        { line: 2, text: 'The <b>judge</b> stays on Opus 5.5 for all three: the grading must not change' },
      ],
    },
    lines: [
      'The setup is one more config file. Under providers: the same assistant three times, each with a different model.',
      'The tests come from the same file as Nina’s regular eval, so every model gets exactly the same eight questions and checks.',
      'One thing doesn’t change: the judge. Opus grades all three, so differences come from the assistant, not from the grading.',
    ],
  },
  {
    chip: '02 · Side by side',
    chapter: 'Three models, side by side',
    char: { moods: [{ line: 1, delay: 1.0, mood: 'surprised' }] },
    highlight: [
      { line: 1, delay: 0.3, until: 2, target: HEAD('Opus 5.5'), label: 'Opus: 8 of 8' },
      { line: 1, delay: 1.6, until: 2, target: HEAD('Sonnet 5.5'), label: 'Sonnet: 8 of 8' },
      { line: 1, delay: 2.9, until: 2, target: HEAD('Haiku 4.5'), label: 'Haiku: 8 of 8' },
      { line: 2, delay: 0.5, until: 3, target: ROW('Annual refund policy'), label: 'same facts, same source, in each model’s words' },
    ],
    do: [
      { line: 0, delay: 0.2, ...VIEW(RUN_MODELS) },
      // hide the variable columns, so the three models fit side by side
      { line: 0, delay: 1.5, act: 'click', hidden: true, target: 'role=["button",{"name":"Columns (6)"}]' },
      { line: 0, delay: 1.8, act: 'click', hidden: true, target: 'role=["button",{"name":"Variables","exact":true}]' },
      { line: 0, delay: 2.0, act: 'press', target: 'Escape' },
    ],
    lines: [
      'Nina runs it once. In Promptfoo’s viewer, each model gets its own column.',
      'Opus: all eight pass. Sonnet: all eight. Haiku: all eight.',
      'Row by row, the answers say the same facts, cite the same documents, just in slightly different words.',
      'She ran it a second time to be sure: twenty-four out of twenty-four again.',
    ],
  },
  {
    chip: '03 · Cost and speed',
    chapter: 'Cost and speed',
    char: { moods: [{ line: 1, mood: 'happy' }] },
    highlight: [
      { line: 0, delay: 0.3, until: 1, target: HEAD('Opus 5.5'), label: 'Opus: $0.041 for 8 answers · 4.5 s each' },
      { line: 0, delay: 3.2, until: 1, target: HEAD('Haiku 4.5'), label: 'Haiku: $0.0067 for 8 answers · 1.4 s each' },
    ],
    card: {
      title: 'Answers only, measured',
      items: [
        { line: 1, text: 'Per 10,000 answers: Opus <b>≈ $51</b> · Sonnet <b>≈ $23</b> · Haiku <b>≈ $8</b>' },
        { line: 2, text: 'Average reply: Opus 4.5 s · Sonnet 2.2 s · Haiku 1.4 s' },
        { line: 3, text: 'The whole comparison: about 2 minutes, about $0.15 (judge included)' },
      ],
    },
    cardFrom: 1,
    lines: [
      'Now the column headers. Each one shows what that model’s eight answers cost, and how fast it replied.',
      'Scale it up to ten thousand customer questions: about fifty-one dollars on Opus, twenty-three on Sonnet, and eight on Haiku.',
      'And Haiku answers in about a second and a half, three times faster than Opus. Customers notice that.',
      'The whole comparison took about two minutes, and cost about fifteen cents.',
    ],
  },
  {
    chip: '04 · And the attacks?',
    chapter: 'Do smaller models resist attacks?',
    char: { moods: [{ line: 0, mood: 'curious' }, { line: 1, delay: 1.5, mood: 'happy' }] },
    highlight: [
      { line: 1, delay: 0.3, until: 2, target: HEAD('Sonnet 5.5'), label: 'Sonnet: 18 of 18 blocked' },
      { line: 1, delay: 1.8, until: 2, target: HEAD('Haiku 4.5'), label: 'Haiku: 18 of 18 blocked' },
    ],
    do: [
      { line: 0, delay: 1.0, ...VIEW(RUN_REDTEAM) },
      { line: 0, delay: 2.4, act: 'click', hidden: true, target: 'role=["button",{"name":"Columns (3)"}]' },
      { line: 0, delay: 2.7, act: 'click', hidden: true, target: 'role=["button",{"name":"Variables","exact":true}]' },
      { line: 0, delay: 2.9, act: 'press', target: 'Escape' },
    ],
    lines: [
      'Passing friendly questions is one thing. Would a smaller model be easier to trick? Nina replays the eighteen recorded attacks against Sonnet and Haiku.',
      'Sonnet blocks all eighteen. Haiku blocks all eighteen. Opus already did, in the last video.',
      'Partly that’s the access filter: none of them ever sees the internal rule. Partly it’s the one-line fix from last time.',
    ],
  },
  {
    chip: '05 · The decision',
    chapter: 'The decision',
    char: { pops: [{ line: 0, delay: 0.6, kind: 'say', text: 'Haiku, about six times cheaper. ✅', until: 1 }] },
    card: {
      title: 'Nina’s recommendation',
      items: [
        { line: 0, text: 'Switch the assistant to <b>Haiku 4.5</b>: same tests passing, ~6× cheaper, ~3× faster' },
        { line: 1, text: 'Only as good as the tests: 8 questions and 18 attacks, not every question customers ask' },
        { line: 2, text: 'The switch goes through a pull request, so CI runs the eval on it' },
        { line: 3, text: 'Keep the judge strong: a cheap judge can wave bad answers through' },
      ],
    },
    lines: [
      'Nina’s recommendation: switch the assistant to Haiku. Same tests passing, about six times cheaper, three times faster.',
      'With one honest caveat. This only proves what the tests check: eight questions and eighteen attacks. Add tests for anything that matters to you before you switch.',
      'The switch itself is a one-line change, in a pull request. So CI runs the eval on it, like any other change.',
      'And the judge stays on Opus. Saving money on the assistant is fine; saving it on the grader means trusting worse grades.',
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
      'Same tests, every model, side by side. Pick the cheapest one that passes, keep the judge strong, and let CI check the switch.',
      'That’s how you choose a model with evidence, not a hunch.',
      'If this helped, give it a like, and subscribe. There’s more coming on testing AI apps.',
    ],
  },
];

export default {
  renderer: 'app',
  template: 'cloudly-support-rag demo + Promptfoo model comparison',
  title: { kicker: 'Hands-on RAG evals · 4', heading: 'Which Claude Model? Test, Then Choose', sub: 'Opus, Sonnet and Haiku on the same tests, side by side' },
  summary: ['Same tests', 'Side by side', 'Cost & speed', 'Cheapest that passes'],
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
    before: [
      'rm -rf .promptfoo-cmp',
      `${PF} npx promptfoo import evals/compare-runs/1-models.json`,
      `${PF} npx promptfoo import evals/compare-runs/2-redteam-sonnet-haiku.json`,
    ],
    serve: {
      cmd: 'npx promptfoo view --yes --port 15500',
      env: { PROMPTFOO_CONFIG_DIR: '.promptfoo-cmp', PROMPTFOO_DISABLE_TELEMETRY: '1', NODE_NO_WARNINGS: '1' },
      ready: 'Server running',
      url: 'http://localhost:15500/eval',
    },
    css: '#root { zoom: 0.72; padding-top: 40px } main > [role="alert"] { display: none }',
  },
  speak: [[/\bPromptfoo\b/g, 'prompt foo'], [/\bQA\b/g, 'Q A'], [/\bCI\b/g, 'C I']],
  thumbnail: { text: 'Opus vs Sonnet vs Haiku with **Promptfoo**', frame: 73.5, crop: [1415, 385, 500, 185], mark: { circle: [226, 124, 156, 36] }, badge: '6× cheaper than Opus', mood: 'surprised', fx: 'exclaim' },
  youtube: {
    title: 'Claude Opus vs Sonnet vs Haiku: Pick the Right Model with Promptfoo (Same Tests, Side by Side)',
    description: `
Is the biggest AI model worth it for your app? How do you know a smaller, cheaper one is good enough?

Nina runs her support assistant's eight golden tests and eighteen red-team attacks on Claude Opus 5.5, Sonnet 5.5 and Haiku 4.5, side by side in Promptfoo, with the same judge grading all three.

What you'll learn:
• Comparing models fairly: same tests, same judge, one config file
• Reading pass rate, cost and latency per model in Promptfoo's viewer
• What the price difference means at 10,000 questions
• Checking that a smaller model still resists attacks
• Why your decision is only as good as your tests, and why the judge stays strong

If this helped, like and subscribe for more on testing AI apps.`,
    tags: ['Promptfoo', 'Claude', 'Claude Opus', 'Claude Sonnet', 'Claude Haiku', 'LLM evaluation', 'model comparison', 'AI cost', 'RAG', 'AI testing', 'tutorial'],
  },
  scenes,
};
