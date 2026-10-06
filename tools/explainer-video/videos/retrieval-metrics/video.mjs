// Scenario: Retrieval metrics explained (metrics series, video 1), a hands-on episode in AgentFlow's
// RAG Eval Visualizer, rendered with app.mjs in AgentFlow mode.
// Story: Priya returns (from conversational-rag-eval). Her eval report is full of numbers; she unpacks them on one
// running example — Leo's "What about monthly ones?": 2 relevant docs exist, the retriever returns 5 chunks.
// Every metric changes live in the real visualizer as chunks are toggled and k changes.
// History and feedback: LOG.md. Scene keys: header of ../../app.mjs.
const RANK = (n) => `[aria-label^="Rank ${n}:"]`;
const K_UP = '[aria-label="Increase K (retrieved)"]';
const K_DOWN = '[aria-label="Decrease K (retrieved)"]';
const ROW = (m) => `[data-metric="${m}"]`;
const CHUNKS = '[data-section="retrieved"]';
const MISSED = '[data-section="missed"]';
const times = (n, base) => Array.from({ length: n }, (_, i) => ({ ...base, delay: (base.delay ?? 0) + i * 0.45 }));

const scenes = [
  {
    chip: 'Overview',
    title: true,
    lines: [
      'Precision, recall, F1, MRR, NDCG. Every RAG eval report is full of them.',
      'In this video, we work out each one by hand, on a single example, and watch them change live.',
    ],
  },
  {
    chip: 'Priya is back',
    char: {
      moods: [{ line: 0, mood: 'curious' }],
      pops: [{ line: 0, delay: 0.8, kind: 'say', text: 'My report says recall 50%, MRR 0.25… what do these actually mean? 🤔' }],
    },
    highlight: [{ line: 1, target: CHUNKS, label: 'the 5 chunks the retriever returned' }],
    lines: [
      'Remember Priya? Her eval report is full of these numbers, and today she works them out on one example.',
      'Leo asks: what about monthly ones? Two documents in the knowledge base answer it. The retriever returns five chunks, ranked one to five.',
      'Green means a chunk is relevant: it helps answer the question. Red means it doesn’t. Only rank one is relevant.',
    ],
  },
  {
    chip: '01 · Precision@5',
    chapter: 'Precision@k',
    highlight: [{ line: 0, target: CHUNKS }, { line: 1, target: ROW('precision'), label: '1 of 5 = 20%' }],
    lines: [
      'Precision at five asks: of the five chunks we returned, how many are relevant?',
      'One out of five. Twenty percent.',
      'Precision measures noise. The other four chunks still go into the prompt, cost tokens, and can distract the model.',
    ],
  },
  {
    chip: '02 · Recall@5',
    chapter: 'Recall@k',
    highlight: [{ line: 0, target: MISSED, label: 'the relevant doc we missed' }, { line: 1, target: ROW('recall'), label: '1 of 2 = 50%' }],
    lines: [
      'Recall asks the opposite question: of the documents that answer it, how many did we find? Two exist, and we found one.',
      'One out of two. Fifty percent.',
      'Recall measures what the model never got to see. A missed document can’t be quoted, however good the model is.',
    ],
  },
  {
    chip: '03 · F1@5',
    chapter: 'F1',
    highlight: [{ line: 0, target: ROW('f1'), label: '2·P·R ÷ (P + R)' }],
    lines: [
      'F1 combines the two, using the harmonic mean: two times precision times recall, divided by their sum.',
      'Here, about twenty-nine percent. A plain average would say thirty-five.',
      'The harmonic mean punishes imbalance. Return everything, and recall is perfect but precision collapses. F1 stays low unless both are good.',
    ],
  },
  {
    chip: '04 · What @k does',
    chapter: 'The k in @k',
    do: [
      ...times(5, { line: 0, delay: 2.2, act: 'click', target: K_UP }),
      { line: 1, delay: 1.0, act: 'click', target: RANK(7) },
    ],
    highlight: [
      { line: 0, target: CHUNKS, label: 'k = 10' },
      { line: 2, target: ROW('recall'), label: '2 of 2 = 100%' },
      { line: 2, target: ROW('precision'), label: '2 of 10 = 20%' },
    ],
    lines: [
      'The k in “at k” is how many results we look at. Let’s raise it from five to ten.',
      'Rank seven turns out to be the second relevant document.',
      'Recall jumps to one hundred percent: both found. Precision stays at twenty: two out of ten. A bigger k finds more, and lets in more noise.',
      'That’s why a RAG pipeline retrieves twenty candidates, for recall, and then a reranker keeps the best five, for precision.',
    ],
  },
  {
    chip: '05 · MRR',
    chapter: 'MRR: where is the first hit?',
    do: [
      ...times(5, { line: 0, delay: 0.6, act: 'click', target: K_DOWN }),
      { line: 1, delay: 0.4, act: 'click', target: RANK(1) },
      { line: 1, delay: 1.2, act: 'click', target: RANK(4) },
    ],
    highlight: [
      { line: 1, delay: 1.6, target: CHUNKS, label: 'the hit moved from rank 1 to rank 4' },
      { line: 2, target: ROW('precision'), label: 'unchanged' },
      { line: 2, target: ROW('recall'), label: 'unchanged' },
      { line: 3, target: ROW('mrr'), label: '1 ÷ 4 = 0.25' },
    ],
    lines: [
      'Back to five. Remember the relevant chunk was at rank one. Now watch what happens if it drops to rank four.',
      'The same chunk, just lower in the list.',
      'Precision: still twenty percent. Recall: still fifty. Neither one notices where the hit is.',
      'MRR does. It’s one divided by the rank of the first relevant result. One over four: a quarter. At rank one, it was a perfect one.',
      'Rank matters because the model reads from the top, and so do people. Averaged over many questions, that’s the mean reciprocal rank.',
    ],
  },
  {
    chip: '06 · NDCG',
    chapter: 'NDCG: the whole order',
    do: [
      { line: 0, delay: 0.8, act: 'click', target: RANK(5) },
      { line: 3, delay: 0.3, act: 'click', target: RANK(4) },
      { line: 3, delay: 0.8, act: 'click', target: RANK(5) },
      { line: 3, delay: 1.3, act: 'click', target: RANK(1) },
      { line: 3, delay: 1.8, act: 'click', target: RANK(2) },
    ],
    highlight: [
      { line: 1, target: ROW('precision'), label: '2 of 5 = 40%', until: 3 },
      { line: 1, target: ROW('recall'), label: '2 of 2 = 100%', until: 3 },
      { line: 2, target: ROW('ndcg'), label: 'about 0.5', until: 3 },
      { line: 3, delay: 2.4, target: ROW('ndcg'), label: 'perfect order = 1.0' },
    ],
    lines: [
      'One more. Put both relevant chunks at the bottom: ranks four and five.',
      'Precision forty percent, recall one hundred. Good numbers, but a bad ranking. And MRR only looks at the first hit.',
      'NDCG scores the whole order. Each relevant result counts for less the lower it sits, and the total is compared with the perfect order. Here, about one half.',
      'Now move them to ranks one and two. NDCG becomes a perfect one.',
      'Same precision. Same recall. Very different ranking quality. That’s what NDCG is for.',
    ],
  },
  {
    chip: 'Which to watch when',
    chapter: 'Which metric when',
    do: [
      { line: 0, delay: 0.3, act: 'click', target: '[aria-label="Close visualizer"]' },
      { line: 0, delay: 1.0, act: 'click', target: '[title="Close panel"]' }, // deselect, so the card sits on a clean canvas
    ],
    cardFrom: 0,
    card: {
      title: 'Which metric, when',
      items: [
        { line: 1, text: '<b>Recall@20</b> on the candidates: did we find it <b>at all</b>?' },
        { line: 2, text: '<b>Precision@5</b> on what reaches the prompt: how much <b>noise</b>?' },
        { line: 3, text: '<b>F1</b>: one number when both matter' },
        { line: 4, text: '<b>MRR</b>: one good document is enough; is it near the top?' },
        { line: 4, text: '<b>NDCG</b>: several documents combine; is the <b>whole order</b> right?' },
      ],
    },
    char: { moods: [{ line: 5, mood: 'happy' }], pops: [{ line: 5, delay: 0.4, kind: 'say', text: 'Now my report actually makes sense! 😄' }] },
    lines: [
      'So which one should you watch? It depends on the stage.',
      'On the twenty candidates, recall: did we find the right document at all? If not, nothing later can fix it.',
      'On the five that reach the prompt, precision: how much noise is the model reading?',
      'F1, when you need one number that respects both.',
      'And for ranking: MRR when one good document answers the question, and NDCG when several documents combine into the answer.',
      'Priya’s report finally reads like a story: what was found, what was missed, and where it sat.',
    ],
  },
  {
    chip: 'Summary',
    summary: true,
    char: { pops: [{ line: 1, kind: 'say', text: 'Thanks! 😄' }] },
    lines: [
      'Precision at k. Recall at k. F1. MRR. NDCG.',
      'Five numbers, one example, and now you know what each one is telling you.',
    ],
  },
];

export default {
  title: { kicker: 'Metrics series · 1', heading: 'Retrieval Metrics, Explained', sub: 'Precision@k, Recall@k, F1, MRR and NDCG, worked out on one example' },
  summary: ['Precision@k', 'Recall@k', 'F1@k', 'MRR', 'NDCG@k'], // @k is a cutoff on the metrics, not a metric of its own
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
    // Hidden before recording: load the RAG Evaluation template, open the visualizer on its RAG Evaluator,
    // and set the running example — k = 5, only rank 1 relevant, 2 relevant docs in the corpus.
    prelude: [
      { target: 'role=["button",{"name":"Cancel"}]', wait: 400 }, // a fresh profile opens "Set up your flow"
      { target: '[title="New flow, templates, load, and document export"]' },
      { target: 'text=Browse templates', wait: 600 },
      { target: 'text=RAG Evaluation', wait: 1500 },
      { target: 'text=RAG Evaluator', wait: 600 },
      { target: 'text=Visualize Precision / Recall', wait: 800 },
      { target: RANK(2) },
      { target: RANK(3) },
      { target: '[aria-label="Decrease Total relevant in corpus"]', times: 6, wait: 120 },
    ],
  },
  speak: [[/\bF1\b/g, 'F one'], [/\bMRR\b/g, 'M R R'], [/\bNDCG\b/g, 'N D C G'], [/\bRAG\b/g, 'rag']],
  thumbnail: { text: 'Precision or **recall?**', frame: 45, crop: [486, 230, 480, 160], mark: { circle: [0, 30, 86, 120] }, badge: 'Recall@5 = 50%', mood: 'curious', pose: 'thinking', fx: 'question' },
  youtube: {
    title: 'Retrieval Metrics Explained: Precision@k, Recall@k, F1, MRR and NDCG (Worked Example)',
    description: `
Your RAG eval says recall@5 is 50% and MRR is 0.25. What does that actually mean, and which number should you care about?

Priya, the engineer from our Conversational RAG eval video, works out every retrieval metric by hand on one example, Leo's question "What about monthly ones?", and watches each number change live as results move around.

What you'll learn:
• Precision@k: how much noise reaches the model
• Recall@k: what the model never got to see
• F1 and why it uses the harmonic mean, not the average
• What the k in @k does, and why pipelines retrieve 20 and keep 5
• MRR: why the rank of the first hit matters when precision and recall don't move
• NDCG: scoring the whole order, and which metric to watch at each stage`,
    tags: ['RAG', 'precision and recall', 'recall at k', 'MRR', 'NDCG', 'F1 score', 'retrieval evaluation', 'information retrieval', 'LLM evaluation', 'evals', 'AI architecture'],
  },
  scenes,
};
