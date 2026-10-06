// Scenario: generation metrics explained (metrics series, video 3), a hands-on episode in AgentFlow's Generation
// Metrics Visualizer, rendered with app.mjs in AgentFlow mode.
// Story: Priya's retrieval scores look great, yet users still get wrong answers. She grades the answer itself on
// Leo's "What about monthly ones?": faithfulness (claims checked against the chunks — the hallucination check,
// including "true but not in the docs" and "faithful but off-topic"), answer relevancy (questions the answer fits
// vs. the real one), context recall and precision (the golden set's facts in the chunks, useful chunks on top),
// then diagnoses four cases: which metric drops points at the generator or the retriever.
// History and feedback: LOG.md. Scene keys: header of ../../app.mjs.
const ANSWER = (label) => `[aria-label="Answer: ${label}"]`;
const TAB = (name) => `role=["tab",{"name":"${name}"}]`;
const RETRIEVAL = (label) => `[aria-label="Retrieval: ${label}"]`;
const CASE = (label) => `[aria-label="Case: ${label}"]`;
const SEC = (name) => `[data-section="${name}"]`;
const NODE = (label) => `.react-flow__node:has-text("${label}")`;

const scenes = [
  {
    chip: 'Overview',
    title: true,
    lines: [
      'Retrieval found the right documents. But did the model use them, or did it make something up?',
      'In this video: the four metrics that grade the answer itself, worked out on one example.',
    ],
  },
  {
    chip: 'Priya is back',
    chapter: 'Retrieval is only half',
    char: {
      moods: [{ line: 0, mood: 'frustrated' }],
      pops: [{ line: 0, delay: 0.8, kind: 'say', text: 'My retrieval scores look great. So why do users still get wrong answers? 🤔' }],
    },
    highlight: [
      { line: 1, target: NODE('Retriever'), label: 'retrieval: the last metrics video', until: 2 },
      { line: 1, delay: 2.5, target: NODE('Answer LLM'), label: 'generation: this video', until: 2 },
      { line: 2, target: NODE('RAG Evaluator'), label: 'grades both halves' },
    ],
    lines: [
      'Priya’s retrieval scores look great. But users still report wrong answers.',
      'Retrieval is only half of RAG. The other half is the model that writes the answer.',
      'So the RAG evaluator grades the answer too. Most of these checks are done by an LLM judge, the one from the last video.',
    ],
  },
  {
    chip: '01 · Faithfulness',
    chapter: 'Faithfulness',
    do: [
      { line: 0, delay: 0.4, act: 'click', target: NODE('RAG Evaluator') },
      { line: 0, delay: 1.4, act: 'click', target: 'text=Visualize Faithfulness / Relevancy' },
      { line: 2, delay: 2.5, act: 'click', target: '[aria-label="Split into claims"]' },
      { line: 3, delay: 1.0, act: 'click', target: '[aria-label="Check each claim"]' },
    ],
    highlight: [
      { line: 0, delay: 3.0, target: SEC('chunks'), label: 'what the model was given', until: 1 },
      { line: 1, delay: 0.5, target: SEC('answers'), label: 'is all of this backed by the chunks?', until: 2 },
      { line: 2, delay: 3.0, target: SEC('claims'), label: 'one fact per claim', until: 3 },
      { line: 3, delay: 1.8, target: SEC('claims'), label: 'each one traced to a chunk', until: 4 },
      { line: 4, delay: 0.3, target: SEC('faithfulness-score'), label: '3 ÷ 3 = 1.00' },
    ],
    lines: [
      'Let’s open it. Back to Leo’s question: “What about monthly ones?” Here are the five chunks the model was given.',
      'Faithfulness asks one thing: is everything in the answer backed by these chunks? Anything the chunks don’t back is a hallucination.',
      'Here’s how it’s measured. Step one: a judge splits the answer into single claims, one fact each.',
      'Step two: it checks each claim against the chunks, and notes where it found it.',
      'All three claims are supported. Faithfulness: three of three, a perfect one.',
    ],
  },
  {
    chip: '02 · Catching a hallucination',
    chapter: 'Catching a hallucination',
    do: [{ line: 0, delay: 0.5, act: 'click', target: ANSWER('Makes things up') }],
    highlight: [
      { line: 0, delay: 1.0, target: SEC('answers'), label: 'starts well, then…', until: 1 },
      { line: 1, target: '[data-claim="contradicted"]', label: 'contradicted by doc 2 §4', until: 2 },
      { line: 2, target: '[data-claim="unsupported"]', label: 'in no chunk: invented', until: 3 },
      { line: 3, target: SEC('faithfulness-score'), label: '2 ÷ 4 = 0.50' },
    ],
    lines: [
      'Now an answer that makes things up. It starts well, then promises a prorated refund, arriving in five business days.',
      'The refund claim is contradicted: the docs say partial months are not refunded.',
      'And no chunk mentions five business days. That was simply invented.',
      'Two of four claims are supported: faithfulness 0.5. That’s how a hallucination shows up in the numbers.',
    ],
  },
  {
    chip: '03 · True isn’t enough',
    chapter: 'True isn’t enough',
    do: [{ line: 0, delay: 0.5, act: 'click', target: ANSWER('True, but not in the docs') }],
    highlight: [
      { line: 0, delay: 1.5, target: '[data-claim="unsupported"]', label: 'maybe true…', until: 1 },
      { line: 1, delay: 1.0, target: SEC('faithfulness-score'), label: '3 ÷ 4 = 0.75' },
    ],
    lines: [
      'This one adds: “you can cancel from the mobile app.” Maybe that’s even true.',
      'But no retrieved chunk says it. It came from the model’s memory, so it counts against faithfulness: 0.75.',
      'Faithfulness doesn’t ask “is it true?” It asks “can I trace it to the documents?” That’s what keeps a RAG answer checkable.',
    ],
  },
  {
    chip: '04 · Faithful, but wrong',
    chapter: 'Faithful, but wrong',
    do: [{ line: 0, delay: 0.5, act: 'click', target: ANSWER('Answers the wrong question') }],
    highlight: [{ line: 0, delay: 2.5, target: SEC('faithfulness-score'), label: '1.00, but…' }],
    lines: [
      'And the opposite trap. This answer is about annual plans. Its claim is backed by a chunk, so faithfulness is a perfect one.',
      'But Leo asked about monthly plans. Faithful isn’t the same as useful. That needs a second metric.',
    ],
  },
  {
    chip: '05 · Answer relevancy',
    chapter: 'Answer relevancy',
    do: [
      { line: 0, delay: 0.4, act: 'click', target: TAB('Answer relevancy') },
      { line: 1, delay: 3.5, act: 'click', target: '[aria-label="Generate questions"]' },
      { line: 3, delay: 0.3, act: 'click', target: ANSWER('Answers the wrong question') },
      { line: 4, delay: 0.3, act: 'click', target: ANSWER('Makes things up') },
    ],
    highlight: [
      { line: 1, delay: 4.2, target: SEC('reverse'), label: 'questions this answer would fit', until: 2 },
      { line: 2, delay: 2.5, target: SEC('relevancy-score'), label: 'average ≈ 0.93', until: 3 },
      { line: 3, delay: 1.0, target: SEC('reverse'), label: 'about annual refunds', until: 4 },
      { line: 4, delay: 1.0, target: SEC('relevancy-score'), label: 'made up, but still 0.90' },
    ],
    lines: [
      'Answer relevancy asks: does the answer address the question that was asked?',
      'It’s measured backwards. A model reads only the answer, and writes the questions that answer would fit.',
      'Each one is compared to Leo’s real question, by meaning, not by shared words. These are close, about 0.9 each. Relevancy: 0.93.',
      'For the annual-plans answer, the questions are all about annual refunds. Similarity drops to around 0.5. Relevancy: 0.47.',
      'But watch this: the made-up answer still scores 0.9. Relevancy checks the topic, not the truth. So you always need both.',
    ],
  },
  {
    chip: '06 · Context recall',
    chapter: 'Context recall',
    do: [
      { line: 0, delay: 0.4, act: 'click', target: TAB('Context recall & precision') },
      { line: 2, delay: 0.3, act: 'click', target: RETRIEVAL('Missing a chunk') },
    ],
    highlight: [
      { line: 0, delay: 2.5, target: SEC('facts'), label: 'must-include facts, from the golden set', until: 1 },
      { line: 1, delay: 1.5, target: '[data-stat="recall"]', label: '3 ÷ 3 = 1.00', until: 2 },
      { line: 2, delay: 1.0, target: '[data-fact="missing"]', label: 'never retrieved', until: 3 },
      { line: 3, target: '[data-stat="recall"]', label: '2 ÷ 3 = 0.67' },
    ],
    lines: [
      'The last two metrics grade what the model was given. Remember the golden set’s must-include facts? Here they are.',
      'Context recall: how many of those facts appear somewhere in the retrieved chunks? All three: a perfect one.',
      'Now the partial-months chunk never came back. Two of three facts: 0.67.',
      'However good the model is, it can’t use a fact it never received.',
    ],
  },
  {
    chip: '07 · Context precision',
    chapter: 'Context precision',
    do: [
      { line: 0, delay: 0.3, act: 'click', target: RETRIEVAL('Good') },
      { line: 1, delay: 0.3, act: 'click', target: RETRIEVAL('Badly ranked') },
    ],
    highlight: [
      { line: 0, delay: 1.5, target: SEC('ranked'), label: 'useful chunks at ranks 1 and 2', until: 1 },
      { line: 1, delay: 2.0, target: '[data-rank="3"]', label: 'rank 3: 1 of 3 useful', until: 2 },
      { line: 1, delay: 4.5, target: '[data-rank="5"]', label: 'rank 5: 2 of 5 useful', until: 2 },
      { line: 2, target: '[data-stat="precision"]', label: '(1/3 + 2/5) ÷ 2 = 0.37', until: 3 },
      { line: 3, target: '[data-stat="recall"]', label: 'recall still 1.00' },
    ],
    lines: [
      'Context precision asks: are the useful chunks near the top? Here they’re ranks one and two, so precision is one.',
      'Now the same chunks, ranked third and fifth. At rank three, one of three chunks so far is useful. At rank five, two of five.',
      'Precision averages those: 0.37.',
      'Recall is still one: nothing is missing. But the model has to dig past noise first, and models tend to miss what’s buried.',
      'Unlike faithfulness and relevancy, these two need the reference answer, so they run on the golden set, not on live traffic.',
    ],
  },
  {
    chip: '08 · Where did it go wrong?',
    chapter: 'Diagnosing a bad answer',
    do: [
      { line: 0, delay: 0.4, act: 'click', target: TAB('Diagnose') },
      { line: 1, delay: 0.3, act: 'click', target: CASE('Made things up') },
      { line: 2, delay: 0.3, act: 'click', target: CASE('Retrieval missed') },
      { line: 3, delay: 0.3, act: 'click', target: CASE('Misread follow-up') },
    ],
    highlight: [
      { line: 0, delay: 1.5, target: SEC('scores'), label: 'generator · retriever', until: 1 },
      { line: 1, delay: 1.0, target: '[data-side="generator"]', label: 'faithfulness drops', until: 2 },
      { line: 2, delay: 1.0, target: '[data-side="retriever"]', label: 'context recall drops', until: 3 },
      { line: 3, delay: 1.0, target: SEC('scores'), label: 'relevancy and precision drop' },
    ],
    lines: [
      'Now put the four together, because they point to where the problem is. A healthy answer: all four high.',
      'Faithfulness drops, but retrieval is fine: the generator made things up. Tell it to answer only from the chunks, and cite them.',
      'Context recall drops, but faithfulness is fine: the retriever missed a fact. Fix the chunking, top k, or the search.',
      'Relevancy and precision both drop: the follow-up wasn’t understood. That’s why Leo’s question gets rewritten into a standalone one before retrieval.',
    ],
  },
  {
    chip: 'Grading the answer',
    chapter: 'Grading the answer',
    do: [{ line: 0, delay: 0.3, act: 'click', target: '[aria-label="Close visualizer"]' }, { line: 0, delay: 1.0, act: 'click', target: '[title="Close panel"]' }],
    cardFrom: 0,
    card: {
      title: 'Grading the answer',
      items: [
        { line: 1, text: '<b>Faithfulness:</b> every claim backed by the chunks. The hallucination check' },
        { line: 2, text: '<b>Answer relevancy:</b> answers the question asked. On topic, not necessarily true' },
        { line: 3, text: '<b>Context recall & precision:</b> the needed facts arrived, near the top. Needs a reference' },
        { line: 4, text: '<b>Judged by an LLM:</b> check the judge against people' },
      ],
    },
    char: {
      moods: [{ line: 5, mood: 'happy' }],
      pops: [{ line: 5, delay: 0.4, kind: 'say', text: 'Now my report says where it went wrong, not just that it did. 😄' }],
    },
    lines: [
      'So, how do you grade an answer?',
      'Faithfulness catches hallucinations: claims the chunks don’t back, even true ones.',
      'Answer relevancy checks it answered the question that was asked.',
      'Context recall and precision check what the model was given, against the golden set.',
      'And since a judge computes most of them, check that judge against people, just like in the last video.',
      'Priya’s next report won’t just say an answer is wrong. It’ll say where it went wrong.',
    ],
  },
  {
    chip: 'Summary',
    summary: true,
    char: { pops: [{ line: 1, kind: 'say', text: 'Thanks! 😄' }] },
    lines: [
      'Faithfulness. Answer relevancy. Context recall. Context precision.',
      'Grade the answer and what it was given, and you’ll know where to look.',
    ],
  },
];

export default {
  title: { kicker: 'Metrics series · 3', heading: 'Generation Metrics, Explained', sub: 'Faithfulness, hallucinations, answer relevancy, and context recall & precision' },
  summary: ['Faithfulness', 'Answer relevancy', 'Context recall', 'Context precision'], // metrics only: claims are a step inside faithfulness
  character: {
    label: 'Priya',
    startMood: 'frustrated',
    look: {
      tag: 'Priya · AI engineer at Cloudly', hairStyle: 'long', hair: '#111827', skin: '#a8714c', neck: '#966242', nose: '#87583a',
      outfit: 'hoodie', top: '#ea580c', topShade: '#c2410c', glasses: true, earrings: false,
    },
  },
  setup: {
    app: 'agentflow',
    // Hidden before recording: load the RAG Evaluation template and fit it to the screen (it's wide: no zoom-in).
    prelude: [
      { target: 'role=["button",{"name":"Cancel"}]', wait: 400 }, // a fresh profile opens "Set up your flow"
      { target: '[title="New flow, templates, load, and document export"]' },
      { target: 'text=Browse templates', wait: 600 },
      { target: 'text=RAG Evaluation', wait: 1500 },
      { target: '.react-flow__controls-fitview', wait: 800 },
    ],
  },
  speak: [[/\bLLM\b/g, 'L L M'], [/\bRAG\b/g, 'rag'], [/\b0\.5\b/g, 'zero point five'], [/\b0\.75\b/g, 'zero point seven five'], [/\b0\.9\b/g, 'zero point nine'], [/\b0\.93\b/g, 'zero point nine three'], [/\b0\.47\b/g, 'zero point four seven'], [/\b0\.67\b/g, 'zero point six seven'], [/\b0\.37\b/g, 'zero point three seven']],
  thumbnail: { text: 'Did the AI **make\u00a0it\u00a0up?**', frame: 92, crop: [485, 560, 560, 270], mark: { circle: [10, 208, 380, 29], cross: [470, 222] }, badge: 'Faithfulness 0.50', mood: 'angry', fx: 'anger' },
  youtube: {
    title: 'RAG Generation Metrics Explained: Faithfulness, Hallucinations, Answer Relevancy & Context Recall',
    description: `
Your retriever finds the right documents, yet users still get wrong answers. How do you measure the answer itself, and tell whether the retriever or the model is to blame?

Priya, the engineer from our evaluation videos, grades one answer to Leo's follow-up question, "What about monthly ones?", and works out each RAGAS-style generation metric step by step.

What you'll learn:
• Faithfulness: how a judge splits an answer into claims and checks each one against the retrieved chunks, the standard hallucination check
• Why a true fact from the model's memory still lowers faithfulness, and why a faithful answer can still be wrong
• Answer relevancy: generating the questions an answer fits and comparing them to the real one
• Context recall and context precision: did the golden set's facts arrive, and were the useful chunks ranked first?
• Diagnosing a bad answer: which metric drops points at the generator, the retriever, or a misread follow-up`,
    tags: ['RAG evaluation', 'faithfulness', 'hallucination', 'answer relevancy', 'context recall', 'context precision', 'RAGAS', 'LLM evaluation', 'evals', 'AI architecture'],
  },
  scenes,
};
