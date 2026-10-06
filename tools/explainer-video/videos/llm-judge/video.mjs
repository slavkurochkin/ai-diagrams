// Scenario: LLM-as-a-judge explained (metrics series, video 2), a hands-on episode in AgentFlow's LLM Judge
// Visualizer, rendered with app.mjs in AgentFlow mode.
// Story: Priya returns. Most of her eval scores come from another model judging answers, so why trust it?
// She grades answers with a weighted rubric, sees how the scale changes the story, catches noise and position
// bias, and checks the judge against human labels — where a "lazy" judge exposes why raw agreement misleads.
// History and feedback: LOG.md. Scene keys: header of ../../app.mjs.
const ANSWER = (label) => `[aria-label="Answer: ${label}"]`;
const CRIT = (label) => `[aria-label="Criterion: ${label}"]`;
const SCALE = (label) => `[aria-label="Scale: ${label}"]`;
const TAB = (name) => `role=["tab",{"name":"${name}"}]`;
const JUDGE = (label) => `[aria-label="Judge: ${label}"]`;
const SEC = (name) => `[data-section="${name}"]`;

const scenes = [
  {
    chip: 'Overview',
    title: true,
    lines: [
      'Most RAG eval scores aren’t computed by a formula. Another model reads the answer and grades it.',
      'In this video, we open up the LLM judge: how it scores, where it goes wrong, and how you know you can trust it.',
    ],
  },
  {
    chip: 'Priya is back',
    char: {
      moods: [{ line: 0, mood: 'curious' }],
      pops: [{ line: 0, delay: 0.8, kind: 'say', text: 'Half my scores come from a model grading another model. Why should I trust it? 🤔' }],
    },
    highlight: [{ line: 1, target: SEC('question'), label: 'the question and the reference answer' }],
    lines: [
      'Priya’s eval report leans on LLM judges for most of its scores. Today she checks how they work.',
      'The judge gets three things: Leo’s question, a reference answer written in advance, and the answer to grade.',
    ],
  },
  {
    chip: '01 · A rubric, not a vibe',
    chapter: 'A rubric, not a vibe',
    highlight: [{ line: 0, target: SEC('rubric'), label: 'one verdict per criterion, with a reason' }, { line: 2, target: SEC('score'), label: '7 ÷ 7 = 1.00' }],
    lines: [
      'It doesn’t just say “looks good”. It checks the answer against a rubric, one criterion at a time: correct, cites a source, complete, concise.',
      'For each one, it gives a verdict and a one-line reason, so a person can check its work.',
      'This grounded answer passes all four. Score: one.',
    ],
  },
  {
    chip: '02 · Weights',
    chapter: 'Weights',
    do: [
      { line: 0, delay: 0.8, act: 'click', target: ANSWER('No citation') },
      { line: 2, delay: 0.6, act: 'click', target: ANSWER('Confident guess') },
      { line: 3, delay: 0.4, act: 'click', target: ANSWER('No citation') },
    ],
    highlight: [
      { line: 0, delay: 1.2, target: '[data-criterion="grounded"]', label: 'fails · weight 2', until: 2 },
      { line: 1, target: SEC('score'), label: '5 ÷ 7 = 0.71', until: 2 },
      { line: 2, delay: 1.0, target: SEC('score'), label: '1 ÷ 7 = 0.14' },
    ],
    lines: [
      'Now the same facts, without a citation. One criterion fails: cites a source.',
      'Criteria have weights. Correctness counts three, citations two, the rest one each. So this answer keeps five of seven points: 0.71.',
      'A confident guess fails almost everything. Only “concise” survives, and being short and wrong isn’t worth much: 0.14.',
      'The weights are a decision you make once, in advance, about what matters most.',
    ],
  },
  {
    chip: '03 · The scale',
    chapter: 'Choosing the scale',
    do: [
      { line: 1, delay: 0.3, act: 'click', target: SCALE('1–5') },
      { line: 2, delay: 0.3, act: 'click', target: SCALE('Pass / Fail') },
    ],
    highlight: [
      { line: 0, target: SEC('score'), label: '0.71' },
    ],
    lines: [
      'The same result can be reported on different scales, and they tell different stories.',
      'On a one-to-five scale, 0.71 becomes a four. Sounds good.',
      'As pass or fail, with a pass mark of 0.75, it fails.',
      'Neither is wrong. Pick the scale for the decision you’re making, and set the pass mark on purpose, not by habit.',
    ],
  },
  {
    chip: '04 · What you leave out',
    chapter: 'What the rubric leaves out',
    do: [
      { line: 0, delay: 0.5, act: 'click', target: SCALE('0–1') },
      { line: 0, delay: 1.1, act: 'click', target: ANSWER('Padded') },
      { line: 1, delay: 0.6, act: 'click', target: CRIT('Concise') },
      { line: 2, delay: 1.5, act: 'click', target: CRIT('Concise') },
    ],
    highlight: [
      { line: 0, delay: 1.6, target: '[data-criterion="concise"]', label: 'fails: filler', until: 1 },
      { line: 1, delay: 1.0, target: SEC('score'), label: '1.00 without “Concise”', until: 2 },
    ],
    lines: [
      'Here’s a padded answer: correct and cited, wrapped in three sentences of filler. Only “concise” fails.',
      'Drop “concise” from the rubric, and the same answer scores a perfect one.',
      'A judge only measures what the rubric names. Whatever you leave out, it won’t see.',
    ],
  },
  {
    chip: '05 · Noise',
    chapter: 'Noise: same answer, different scores',
    do: [
      { line: 0, delay: 0.4, act: 'click', target: TAB('Is it consistent?') },
      { line: 2, delay: 0.5, act: 'click', target: '[aria-label="Pin the judge"]' },
    ],
    highlight: [
      { line: 1, target: SEC('repeats'), label: '4 · 5 · 4 · 3 · 4', until: 2 },
      { line: 2, delay: 1.0, target: SEC('repeats'), label: 'pinned: 4 every time' },
    ],
    lines: [
      'Next problem: a judge is a model, and models vary. The same answer, judged five times.',
      'Four, five, four, three, four. With a pass mark of four, run four fails an answer the other runs pass.',
      'The fix: pin the judge’s model version, and average a few samples instead of trusting one. Now it’s four, every time.',
    ],
  },
  {
    chip: '06 · Position bias',
    chapter: 'Position bias',
    do: [{ line: 2, delay: 0.4, act: 'click', target: '[aria-label="Judge both orders"]' }],
    highlight: [
      { line: 0, target: SEC('position'), label: 'two answers that say the same thing' },
    ],
    lines: [
      'Judges also have biases. Ask one to compare two answers that say the same thing, A shown first.',
      'It picks A. Is A better, or was it just first?',
      'Judge both orders. Shown B first, it picks B. The winner follows the order, not the answers: that’s position bias, and the honest verdict is a tie.',
      'Judges have other habits too: favoring longer answers, or answers written by their own model family. Every pairwise eval should swap the order.',
    ],
  },
  {
    chip: '07 · Check against humans',
    chapter: 'Checking against human labels',
    do: [{ line: 0, delay: 0.4, act: 'click', target: TAB('Can we trust it?') }],
    highlight: [
      { line: 1, target: SEC('labels'), label: 'red = the judge disagrees with a person' },
      { line: 2, target: '[data-stat="agreement"]', label: '9 of 12' },
    ],
    lines: [
      'So how do you know a judge is good enough? You check it against people.',
      'A person labels a sample of answers pass or fail, and the judge grades the same ones.',
      'Rubric version one agrees on nine of twelve: seventy-five percent. The red rows show how it fails: it passed two confident guesses, and failed a short answer that was fine.',
    ],
  },
  {
    chip: '08 · Fix the rubric',
    chapter: 'Fixing the rubric',
    do: [{ line: 0, delay: 1.2, act: 'click', target: JUDGE('Rubric v2') }],
    highlight: [{ line: 1, target: '[data-stat="agreement"]', label: '11 of 12' }, { line: 1, target: '[data-stat="kappa"]', label: '0.40 → 0.80' }],
    lines: [
      'Version two adds two rules: a guess scores zero, and short is fine if it’s complete.',
      'Now it agrees on eleven of twelve. And the second number, Cohen’s kappa, doubles from 0.4 to 0.8.',
    ],
  },
  {
    chip: '09 · Why kappa',
    chapter: 'Why kappa, not just agreement',
    do: [{ line: 0, delay: 0.6, act: 'click', target: JUDGE('Lazy judge') }],
    highlight: [
      { line: 1, target: '[data-stat="agreement"]', label: '67% — sounds fine' },
      { line: 2, target: '[data-stat="kappa"]', label: 'κ = 0: no better than chance' },
    ],
    lines: [
      'Why two numbers? Meet the lazy judge. It says pass to everything.',
      'Because most answers in the sample really do pass, it still agrees sixty-seven percent of the time.',
      'Kappa corrects for that. It asks how much better than chance the judge is, and the lazy judge scores exactly zero. As a rule of thumb, look for at least 0.6.',
    ],
  },
  {
    chip: 'A judge you can trust',
    chapter: 'A judge you can trust',
    do: [{ line: 0, delay: 0.3, act: 'click', target: '[aria-label="Close visualizer"]' }, { line: 0, delay: 1.0, act: 'click', target: '[title="Close panel"]' }],
    cardFrom: 0,
    card: {
      title: 'A judge you can trust',
      items: [
        { line: 1, text: '<b>A rubric</b> with weights, written before you see results' },
        { line: 2, text: '<b>A deliberate scale</b> and pass mark' },
        { line: 3, text: '<b>Pinned model</b>, averaged samples · <b>both orders</b> for pairwise' },
        { line: 4, text: '<b>Checked against people:</b> agreement and κ ≥ 0.6, re-checked whenever the judge changes' },
      ],
    },
    char: { moods: [{ line: 5, mood: 'happy' }], pops: [{ line: 5, delay: 0.4, kind: 'say', text: 'Now I know when to trust a score, and when to check it. 😄' }] },
    lines: [
      'So what makes a judge trustworthy?',
      'A rubric with weights, written before you look at the results.',
      'A scale and a pass mark, chosen on purpose.',
      'A pinned model with averaged samples, and pairwise comparisons judged in both orders.',
      'And regular checks against human labels, with kappa, not just agreement. Re-check whenever you change the judge’s model or prompt.',
      'Priya’s scores still come from a model. But now she knows when to trust them.',
    ],
  },
  {
    chip: 'Summary',
    summary: true,
    char: { pops: [{ line: 1, kind: 'say', text: 'Thanks! 😄' }] },
    lines: [
      'Rubric. Weights. Scale. Noise. Bias. Agreement.',
      'An LLM judge is a measuring instrument. Calibrate it, and it earns your trust.',
    ],
  },
];

export default {
  title: { kicker: 'Metrics series · 2', heading: 'LLM-as-a-Judge, Explained', sub: 'Rubrics, scales, noise, bias, and checking the judge against people' },
  summary: ['Rubric', 'Weights', 'Scale', 'Noise', 'Bias', 'Agreement'],
  character: {
    label: 'Priya',
    startMood: 'curious',
    look: {
      tag: 'Priya · AI engineer at Cloudly', hairStyle: 'long', hair: '#111827', skin: '#a8714c', neck: '#966242', nose: '#87583a',
      outfit: 'hoodie', top: '#ea580c', topShade: '#c2410c', glasses: true, earrings: false,
    },
  },
  setup: {
    app: 'agentflow',
    // Hidden before recording: load the LLM Evaluation Pipeline, select its LLM Judge, open the visualizer.
    prelude: [
      { target: 'role=["button",{"name":"Cancel"}]', wait: 400 }, // a fresh profile opens "Set up your flow"
      { target: '[title="New flow, templates, load, and document export"]' },
      { target: 'text=Browse templates', wait: 600 },
      { target: 'text=LLM Evaluation Pipeline', wait: 1500 },
      { target: 'text=LLM Judge', wait: 600 },
      { target: 'text=Visualize LLM Judge', wait: 800 },
    ],
  },
  speak: [[/\bLLM\b/g, 'L L M'], [/\bRAG\b/g, 'rag'], [/\b0\.71\b/g, 'zero point seven one'], [/\b0\.14\b/g, 'zero point one four'], [/\b0\.75\b/g, 'zero point seven five'], [/\b0\.4\b/g, 'zero point four'], [/\b0\.8\b/g, 'zero point eight'], [/\b0\.6\b/g, 'zero point six']],
  youtube: {
    title: 'LLM-as-a-Judge Explained: Rubrics, Scales, Noise, Bias & Cohen’s Kappa',
    description: `
Most RAG and agent eval scores come from another model grading the answer. How does an LLM judge score, where does it go wrong, and how do you know you can trust it?

Priya, the engineer from our evaluation videos, opens up the judge: she grades answers against a weighted rubric, watches the scale change the story, catches noise and position bias, and checks the judge against human labels.

What you'll learn:
• How an LLM judge scores with a rubric: per-criterion verdicts, reasons, and weights
• Why 0.71 can be a "4 out of 5" and a "fail" at the same time
• What a rubric leaves out, the judge can't see
• Judge noise, and why you pin the model and average samples
• Position bias in pairwise comparisons, and judging both orders
• Checking a judge against people: agreement vs. Cohen's kappa, and the lazy judge that scores 67% with κ = 0`,
    tags: ['LLM as a judge', 'LLM evaluation', 'evals', 'RAG evaluation', 'Cohen kappa', 'position bias', 'AI testing', 'rubric', 'AI architecture', 'Claude'],
  },
  scenes,
};
