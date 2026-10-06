// Scenario: LLM-as-a-judge explained (metrics series, video 2), a hands-on episode in AgentFlow's LLM Judge
// Visualizer, rendered with app.mjs in AgentFlow mode.
// Story: Priya returns. Most of her eval scores come from a model grading another model, so who checks the grader?
// The thread is a teacher grading essays: an answer key (the golden dataset — what it holds and how it's built),
// a marking scheme (the rubric — what the judge actually sees and returns), then the grader's flaws (scale, blind
// spots, noise and its standard deviation, judge biases), synthetic data for the answer key, and the check on the grader: agreement with people's labels, kappa vs. chance, and the margin of error.
// History and feedback: LOG.md. Scene keys: header of ../../app.mjs.
const ANSWER = (label) => `[aria-label="Answer: ${label}"]`;
const CRIT = (label) => `[aria-label="Criterion: ${label}"]`;
const SCALE = (label) => `[aria-label="Scale: ${label}"]`;
const TAB = (name) => `role=["tab",{"name":"${name}"}]`;
const JUDGE = (label) => `[aria-label="Judge: ${label}"]`;
const SEC = (name) => `[data-section="${name}"]`;
const NODE = (label) => `.react-flow__node:has-text("${label}")`;
const STEP = (n) => `[data-step="${n}"]`;
const PROMPT = `[aria-label="Show the judge's prompt"]`;
const QUESTION = (n) => `[data-question="${n}"]`;

const scenes = [
  {
    chip: 'Overview',
    title: true,
    lines: [
      'Many AI eval scores aren’t computed by a formula. Another model reads each answer and grades it.',
      'This is called LLM-as-a-judge. Let’s see how it works, and how you know you can trust it.',
    ],
  },
  {
    chip: 'Priya is back',
    chapter: 'Where the judge sits',
    char: {
      moods: [{ line: 0, mood: 'curious' }],
      pops: [{ line: 0, delay: 0.8, kind: 'say', text: 'Half my scores come from a model grading another model. Who checks the grader? 🤔' }],
    },
    highlight: [
      { line: 1, target: NODE('Model Under Test'), label: 'the model being tested', until: 2 },
      { line: 2, target: NODE('LLM Judge'), label: 'the judge: a second model' },
    ],
    lines: [
      'Priya’s eval pipeline is full of scores like this. Today she looks at where they come from.',
      'Each test question goes to the model being tested, and it writes an answer.',
      'Then a second model, the judge, reads that answer and grades it.',
    ],
  },
  {
    chip: 'Why a judge?',
    chapter: 'Why use a model as a judge',
    highlight: [
      { line: 2, delay: 2.5, target: NODE('Ground Truth'), label: 'the answer key', until: 3 },
      { line: 3, target: NODE('Ground Truth'), label: 'answer key = golden dataset' },
      { line: 3, delay: 1.5, target: NODE('Rubric'), label: 'marking scheme = rubric' },
    ],
    lines: [
      'Why not just compare the text? Because “cancel anytime” and “cancel whenever you like” mean the same thing, but don’t match word for word.',
      'A person sees that instantly. But nobody can read five hundred answers on every release.',
      'So we use a model, like a teacher grading essays. A good teacher needs two things. First, an answer key: what a good answer should say.',
      'Second, a marking scheme: what earns points. For a judge, the answer key is the golden dataset, and the marking scheme is the rubric.',
    ],
  },
  {
    chip: '01 · The answer key',
    chapter: 'The golden dataset',
    do: [
      { line: 0, delay: 0.6, act: 'click', target: NODE('LLM Judge') },
      { line: 0, delay: 1.6, act: 'click', target: 'text=Visualize LLM Judge' },
    ],
    highlight: [
      { line: 1, target: SEC('golden-example'), label: 'one golden example' },
      { line: 2, delay: 0.5, target: '[data-golden="reference"]', label: 'written from doc 2' },
    ],
    lines: [
      'Let’s open the judge. First, the answer key.',
      'A golden dataset is a list of test questions, each with an answer you’ve agreed is right. Here’s one: Leo asks “what about monthly ones?”, right after asking about annual plans.',
      'Its reference answer was written from the billing policy, document two. It also lists the facts any good answer must include.',
    ],
  },
  {
    chip: '02 · Building the answer key',
    chapter: 'How you build a golden dataset',
    do: [
      { line: 1, delay: 0.2, act: 'click', target: '[aria-label="Next step"]' },
      { line: 2, delay: 0.2, act: 'click', target: '[aria-label="Next step"]' },
      { line: 3, delay: 0.2, act: 'click', target: '[aria-label="Next step"]' },
      { line: 4, delay: 0.2, act: 'click', target: '[aria-label="Next step"]' },
    ],
    highlight: [
      { line: 0, target: STEP(1), label: 'real questions', until: 1 },
      { line: 1, delay: 0.6, target: STEP(2), label: 'a balanced mix', until: 2 },
      { line: 2, delay: 0.6, target: STEP(3), label: 'written by experts', until: 3 },
      { line: 3, delay: 0.6, target: STEP(4), label: 'people’s labels: we’ll need these', until: 4 },
      { line: 4, delay: 0.6, target: STEP(5), label: 'keep it growing' },
    ],
    lines: [
      'So where does it come from? Step one: collect real questions, from logs and support tickets. A model can help draft more. We’ll get to that in a moment.',
      'Two: pick a balanced mix. Easy questions, hard ones, follow-ups, and questions the docs can’t answer, where the right reply is “I don’t know”. Fifty to two hundred is a good start.',
      'Three: someone who knows the subject writes each reference answer from the source documents, and a second person reviews it.',
      'Four: people label real answers pass or fail. Remember these labels. Later, they’re how we check the judge.',
      'Five: keep part of the set hidden for testing, version it, and add every failure you find in production.',
    ],
  },
  {
    chip: '03 · Synthetic data',
    chapter: 'Synthetic test data',
    do: [
      { line: 0, delay: 0.5, act: 'click', target: TAB('Synthetic data') },
      { line: 1, delay: 3.0, act: 'click', target: '[aria-label="Generate questions"]' },
      { line: 3, delay: 0.3, act: 'click', target: '[aria-label="Review each one"]' },
    ],
    highlight: [
      { line: 1, delay: 0.5, target: SEC('chunk'), label: 'one chunk of the docs', until: 2 },
      { line: 2, target: SEC('synthetic-list'), label: 'rewordings · traps · “docs don’t say”', until: 3 },
      { line: 3, delay: 2.5, target: '[data-synthetic="reject"]', label: 'rejected: copies the doc', until: 4 },
      { line: 4, target: SEC('real-vs-synthetic'), label: 'synthetic: easier than real' },
    ],
    lines: [
      'Real questions are best, but there are rarely enough of them, especially for a new feature. So teams generate more: synthetic data.',
      'A model reads a chunk of the docs, here the monthly billing policy, and drafts test questions from it.',
      'It can make different kinds: rewordings that sound like real users, traps with a tempting wrong answer, and questions the docs can’t answer.',
      'But drafts have problems. Some copy the doc’s exact wording, so they’re far too easy. Others sound like no real user. So a person reviews every one, and keeps only the good ones.',
      'Even after review, synthetic questions tend to be easier. Here the judge passes ninety-four percent of synthetic questions, but only seventy-eight percent of real ones.',
      'So tag synthetic items, mix them with real ones, and watch that gap. And don’t let the same model write the questions and grade the answers: they’d share the same blind spots.',
    ],
  },
  {
    chip: '04 · The rubric',
    chapter: 'The rubric: how the judge grades',
    do: [
      { line: 0, delay: 0.4, act: 'click', target: TAB('Grade an answer') },
      { line: 1, delay: 2.0, act: 'click', target: PROMPT },
      { line: 4, delay: 0.3, act: 'click', target: PROMPT },
    ],
    highlight: [
      { line: 0, delay: 1.0, target: SEC('question'), label: 'from the golden set', until: 1 },
      { line: 2, target: '[data-prompt="in"]', label: 'question · reference · answer · rubric', until: 3 },
      { line: 3, target: '[data-prompt="out"]', label: 'pass or fail, with a reason', until: 4 },
      { line: 4, delay: 1.0, target: SEC('rubric'), label: 'all four pass' },
      { line: 4, delay: 2.5, target: SEC('score'), label: 'score: 1.00' },
    ],
    lines: [
      'Now the judge grades an answer. Here’s the question and the reference from the golden set, and the answer to grade.',
      'The judge doesn’t just say “looks good”. Under the hood, it gets a prompt.',
      'The prompt holds the question, the reference answer, the answer to grade, and the rubric: four criteria, each with a short definition.',
      'It replies with a pass or a fail for each criterion, plus a reason, so a person can check its work.',
      'Here are those verdicts. This answer passes all four, so it scores a perfect one.',
    ],
  },
  {
    chip: '05 · Weights',
    chapter: 'Weights',
    do: [
      { line: 0, delay: 0.6, act: 'click', target: ANSWER('No citation') },
      { line: 3, delay: 0.3, act: 'click', target: ANSWER('Confident guess') },
    ],
    highlight: [
      { line: 0, delay: 1.2, target: '[data-criterion="grounded"]', label: 'fails', until: 1 },
      { line: 1, target: SEC('rubric'), label: '3 + 2 + 1 + 1 = 7 points', until: 2 },
      { line: 2, target: SEC('score'), label: '5 of 7 points = 0.71', until: 3 },
      { line: 3, delay: 1.0, target: SEC('score'), label: '1 of 7 points = 0.14' },
    ],
    lines: [
      'Now the same answer, without a citation. One criterion fails: cites a source.',
      'Some criteria matter more, so they carry more points. Correct is worth three, citing a source two, the others one each. Seven points in total.',
      'This answer keeps five of the seven points. Five divided by seven: 0.71.',
      'A confident guess gets only the point for being short. One of seven: 0.14.',
    ],
  },
  {
    chip: '06 · Pass or fail?',
    chapter: 'Pass or fail?',
    do: [
      { line: 0, delay: 0.3, act: 'click', target: ANSWER('No citation') },
      { line: 1, delay: 0.3, act: 'click', target: SCALE('1–5') },
      { line: 2, delay: 0.3, act: 'click', target: SCALE('Pass / Fail') },
    ],
    highlight: [{ line: 0, delay: 0.8, target: SEC('score'), label: '0.71: good or bad?' }],
    lines: [
      'Back to the answer with no citation, at 0.71. Is that good?',
      'On a one-to-five scale, it’s a four. Sounds fine.',
      'But with a pass mark of 0.75, it fails.',
      'Same answer, different story. So choose the scale and the pass mark up front, before you see any results.',
    ],
  },
  {
    chip: '07 · Blind spots',
    chapter: 'What the rubric leaves out',
    do: [
      { line: 0, delay: 0.3, act: 'click', target: SCALE('0–1') },
      { line: 0, delay: 0.9, act: 'click', target: ANSWER('Padded') },
      { line: 1, delay: 0.5, act: 'click', target: CRIT('Concise') },
      { line: 2, delay: 2.0, act: 'click', target: CRIT('Concise') },
    ],
    highlight: [
      { line: 0, delay: 2.0, target: '[data-criterion="concise"]', label: 'fails: filler', until: 1 },
      { line: 1, delay: 1.0, target: SEC('score'), label: '1.00 without “Concise”', until: 2 },
    ],
    lines: [
      'This padded answer is correct and cited, but wrapped in filler. Only “concise” fails, so it scores 0.86.',
      'Remove “concise” from the rubric, and the same answer scores a perfect one.',
      'The judge only checks what the rubric asks for. Anything you leave out, it can’t see.',
    ],
  },
  {
    chip: '08 · Noise',
    chapter: 'Noise and standard deviation',
    do: [
      { line: 0, delay: 0.4, act: 'click', target: TAB('Is it consistent?') },
      { line: 2, delay: 3.5, act: 'click', target: '[aria-label="Show the math"]' },
      { line: 5, delay: 1.5, act: 'click', target: '[aria-label="Pin the judge"]' },
      { line: 6, delay: 0.3, act: 'click', target: '[aria-label="Pin the judge"]' },
      { line: 6, delay: 2.5, act: 'click', target: '[aria-label="Average the runs"]' },
    ],
    highlight: [
      { line: 1, target: SEC('repeats'), label: '4 · 5 · 4 · 3 · 4', until: 2 },
      { line: 3, target: SEC('sd-math'), label: 'average 4 · distances 0, 1, 0, 1, 0', until: 4 },
      { line: 4, delay: 0.5, target: SEC('sd-math'), label: '√0.4 = 0.63', until: 5 },
      { line: 5, delay: 3.0, target: SEC('repeats'), label: 'pinned: 4 every time', until: 6 },
      { line: 6, delay: 4.0, target: '[data-fix="average"]', label: 'one run ± 0.63 → average of 5 ± 0.28' },
    ],
    lines: [
      'Next: is the judge consistent? Here’s the same answer, graded five times on the one-to-five scale.',
      'Four, five, four, three, four. Same answer, different scores, because a model’s replies vary a little each time. With a pass mark of four, run four fails it.',
      'How much do the scores vary? That’s what the standard deviation measures. Here’s how it’s worked out.',
      'First, the average: four. Then each run’s distance from it: zero, one, zero, one, zero.',
      'Square those, average them, and take the square root: 0.63. So a typical run lands about 0.63 away from the average.',
      'Fix one: pin the model. Use one fixed model version and temperature zero, so the same input gets the same reply. Now every run scores four.',
      'Fix two, for models you can’t pin: run the judge several times and average. The average of five runs wobbles far less than one run: about 0.28, instead of 0.63.',
    ],
  },
  {
    chip: '09 · Judge bias',
    chapter: 'Judge bias',
    do: [
      { line: 0, delay: 0.4, act: 'click', target: TAB('Is it biased?') },
      { line: 3, delay: 0.5, act: 'click', target: '[aria-label="Judge both orders"]' },
    ],
    highlight: [
      { line: 1, delay: 1.5, target: SEC('pair'), label: 'old prompt vs. new prompt: same meaning', until: 2 },
      { line: 2, delay: 1.5, target: '[data-verdict]', label: 'keep the old prompt?', until: 3 },
      { line: 3, delay: 2.0, target: '[data-verdict]', label: 'the winner follows the order', until: 5 },
      { line: 5, delay: 0.5, target: SEC('biases'), label: 'four common biases, four fixes' },
    ],
    lines: [
      'Judges have biases too. Here’s one that matters when Priya changes her prompt.',
      'To compare her old prompt with a new one, the judge reads both answers to the same question, and picks the better one. Here, both answers say the same thing.',
      'Shown the old prompt’s answer first, the judge picks the old prompt. So should Priya keep it?',
      'Swap the order. Shown the new answer first, it picks the new one. It’s choosing by position, not by quality. That’s position bias.',
      'The fix: always judge both orders, and if the winner changes, call it a tie. Here neither prompt is better, so Priya doesn’t switch, or stay, for the wrong reason.',
      'Position is just one bias. Judges also prefer longer answers, and answers from their own model family. And many pass too much. Each one has a fix.',
    ],
  },
  {
    chip: '10 · Can we trust it?',
    chapter: 'Can we trust the judge?',
    do: [
      { line: 0, delay: 0.4, act: 'click', target: TAB('Can we trust it?') },
      { line: 0, delay: 1.0, act: 'click', target: QUESTION(1) }, // straight to question 1: never show every number at once
    ],
    highlight: [
      { line: 0, delay: 2.0, target: SEC('questions'), label: 'three questions', until: 1 },
      { line: 1, delay: 3.5, target: SEC('labels'), label: '“person” column: graded by hand', until: 2 },
      { line: 2, delay: 2.5, target: '[data-stat="agreement"]', label: '9 of 12', until: 3 },
      { line: 3, target: SEC('labels'), label: 'red rows: the judge got it wrong' },
    ],
    lines: [
      'Last part: can we trust the judge? We’ll answer three simple questions.',
      'Question one: does it agree with people? Priya asked a colleague to grade twelve answers by hand, pass or fail. That’s the “person” column. The judge grades the same twelve.',
      'Red rows are where they disagree. Version one agrees on nine of twelve: seventy-five percent.',
      'It passed two confident guesses, and failed a short answer that was fine.',
    ],
  },
  {
    chip: '11 · Fix the rubric',
    chapter: 'Fixing the rubric',
    do: [{ line: 0, delay: 1.5, act: 'click', target: JUDGE('Rubric v2') }],
    highlight: [{ line: 1, target: '[data-stat="agreement"]', label: '11 of 12' }],
    lines: [
      'So Priya fixes the rubric: a guess always fails, and a short answer is fine if it’s complete.',
      'Now it agrees on eleven of twelve: ninety-two percent.',
    ],
  },
  {
    chip: '12 · Better than guessing?',
    chapter: 'Better than guessing? (kappa)',
    do: [
      { line: 0, delay: 2.5, act: 'click', target: JUDGE('Lazy judge') }, // still on question 1: agreement only
      { line: 2, delay: 0.3, act: 'click', target: QUESTION(2) }, // chance and kappa appear when the narration gets to them
      { line: 4, delay: 0.3, act: 'click', target: JUDGE('Rubric v2') },
    ],
    highlight: [
      { line: 0, target: QUESTION(2), label: 'question two', until: 1 },
      { line: 1, delay: 1.0, target: '[data-stat="agreement"]', label: '8 of 12, for free', until: 2 },
      { line: 2, delay: 1.0, target: '[data-stat="chance"]', label: 'what chance alone gets', until: 3 },
      { line: 3, target: '[data-stat="kappa"]', label: 'κ = 0: no better than guessing', until: 4 },
      { line: 4, delay: 1.5, target: '[data-stat="kappa"]', label: 'v2: κ = 0.80' },
    ],
    lines: [
      'Question two: is it better than guessing? Meet the lazy judge. It says pass to everything, without reading a word.',
      'Eight of the twelve answers really are good, so it’s right eight times out of twelve: sixty-seven percent, for free.',
      'That free score is what chance alone gets. Cohen’s kappa asks how much better than chance a judge does.',
      'The lazy judge does no better, so its kappa is zero.',
      'Version two closes most of the gap between chance and perfect: kappa 0.8. Aim for at least 0.6.',
    ],
  },
  {
    chip: '13 · Enough labels?',
    chapter: 'Enough labels? (margin of error)',
    do: [
      { line: 0, delay: 0.3, act: 'click', target: QUESTION(3) },
      { line: 4, delay: 0.3, act: 'click', target: '[aria-label="Sample: 200 labels"]' },
    ],
    highlight: [
      { line: 1, delay: 0.5, target: '[data-stat="per-answer"]', label: '100% ÷ 12 ≈ 8 points each', until: 2 },
      { line: 2, delay: 3.5, target: '[data-stat="margin-formula"]', label: 'agreement · labels · 2 for 95% confidence', until: 3 },
      { line: 3, delay: 0.5, target: '[data-stat="range"]', label: '± 16: 76% to 100%', until: 4 },
      { line: 4, delay: 2.0, target: '[data-stat="range"]', label: '200 labels: ± 4, 88% to 96%' },
    ],
    lines: [
      'Question three: did we check enough answers?',
      'With only twelve, each answer is worth about eight percentage points. One more disagreement, and ninety-two percent drops to eighty-three.',
      'So ninety-two is a rough number. The margin of error says how rough. It comes from this formula: the agreement, the number of labels, and a factor of two for ninety-five percent confidence.',
      'For twelve labels, it’s plus or minus sixteen points. The real agreement could be anywhere from seventy-six percent to a hundred.',
      'With two hundred labels, each answer is worth half a point, and the margin shrinks to plus or minus four: eighty-eight to ninety-six.',
      'So label a hundred to two hundred answers before you trust the number.',
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
        { line: 1, text: '<b>A golden dataset:</b> real questions, plus reviewed synthetic ones' },
        { line: 2, text: '<b>A clear rubric</b> and pass mark, set in advance' },
        { line: 3, text: '<b>A pinned model</b>, comparisons judged both ways' },
        { line: 4, text: '<b>Checked against people:</b> agrees · beats chance (κ ≥ 0.6) · 100–200 labels' },
      ],
    },
    char: {
      moods: [{ line: 5, mood: 'happy' }],
      pops: [
        { line: 5, delay: 0.4, kind: 'say', text: 'Now I know when to trust a score, and when to check it. 😄' },
        { line: 6, delay: 0.4, kind: 'say', text: 'Next: catching answers that make things up! 🔍' },
      ],
    },
    lines: [
      'So, what makes a judge you can trust?',
      'A golden dataset, built from real questions, plus reviewed synthetic ones.',
      'A clear rubric and pass mark, set before you see results.',
      'A pinned model, with comparisons judged in both orders.',
      'And a check against people: it agrees with them, it beats chance, and you labeled enough answers to be sure.',
      'Priya’s scores still come from a model. But now she knows when to trust them.',
      'Next time, she puts the judge to work on the biggest question of all: is the answer faithful to the documents, or did the model make it up?',
    ],
  },
  {
    chip: 'Summary',
    summary: true,
    char: { pops: [{ line: 1, kind: 'say', text: 'Thanks! 😄' }] },
    lines: [
      'Golden set. Rubric. Noise. Bias. Then three checks: agreement, kappa, and margin of error.',
      'A judge is a measuring tool. Check it against people, and you can trust its scores.',
    ],
  },
];

export default {
  title: { kicker: 'Metrics series · 2', heading: 'LLM-as-a-Judge, Explained', sub: 'Answer keys, rubrics, and how to check the grader' },
  summary: ['Golden set', 'Rubric', 'Noise', 'Bias', 'Agreement', 'Kappa', 'Margin of error'],
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
    // Hidden before recording: load the LLM Evaluation Pipeline, fit it to the screen, and zoom in one step.
    prelude: [
      { target: 'role=["button",{"name":"Cancel"}]', wait: 400 }, // a fresh profile opens "Set up your flow"
      { target: '[title="New flow, templates, load, and document export"]' },
      { target: 'text=Browse templates', wait: 600 },
      { target: 'text=LLM Evaluation Pipeline', wait: 1500 },
      { target: '.react-flow__controls-fitview', wait: 800 },
      { target: '.react-flow__controls-zoomin', wait: 600 }, // one step in: every node still fits, labels readable
    ],
  },
  speak: [[/\bLLM\b/g, 'L L M'], [/\b0\.71\b/g, 'zero point seven one'], [/\b0\.14\b/g, 'zero point one four'], [/\b0\.86\b/g, 'zero point eight six'], [/\b0\.75\b/g, 'zero point seven five'], [/\b0\.8\b/g, 'zero point eight'], [/\b0\.6\b/g, 'zero point six'], [/\b0\.63\b/g, 'zero point six three'], [/\b0\.28\b/g, 'zero point two eight']],
  thumbnail: { text: 'Trust the **AI\u00a0judge?**', frame: 468, crop: [965, 425, 550, 245], mark: { circle: [7, 64, 533, 31] }, badge: 'Judge ✓ · Human ✗', mood: 'suspicious', pose: 'thinking' },
  youtube: {
    title: 'LLM-as-a-Judge Explained: Golden Datasets, Rubrics, Bias & Cohen’s Kappa',
    description: `
Most AI eval scores come from another model grading the answer. How does an LLM judge work, where does its answer key come from, and how do you know you can trust it?

Priya, the engineer from our evaluation videos, treats the judge like a teacher grading essays: it needs an answer key (the golden dataset) and a marking scheme (the rubric). Then she checks the grader itself.

What you'll learn:
• What a golden dataset holds, and how to build one: real questions, expert reference answers, human labels
• Synthetic test data: how a model drafts questions from your docs, what goes wrong, and how to review it
• What the judge actually sees and returns: the prompt, and a pass/fail verdict per rubric criterion
• How weights, scales, and pass marks turn verdicts into a score, and what a rubric can't see
• Judge noise (standard deviation) and judge biases: position, length, self-preference, leniency
• Checking the judge against people: agreement vs. Cohen's kappa, the lazy judge with κ = 0, and the margin of error on 12 vs. 200 labels`,
    tags: ['LLM as a judge', 'golden dataset', 'synthetic data', 'LLM evaluation', 'evals', 'rubric', 'Cohen kappa', 'position bias', 'AI testing', 'AI architecture', 'Claude'],
  },
  scenes,
};
