// ── Generation metrics, explained ────────────────────────────────────────────
// Pure, deterministic model of the RAGAS-style generation metrics: faithfulness (are the answer's claims backed
// by the retrieved chunks? — the hallucination check), answer relevancy (does it answer the question asked?),
// and context recall / precision (did retrieval bring the facts the reference needs, ranked high?). Shared by
// the Generation Metrics Visualizer and its tests. Claims, verdicts, and similarities are worked examples written
// down in advance, standing in for what an LLM judge and an embedding model would return.

export const QUESTION = 'What about monthly ones?'
export const CONTEXT_NOTE = 'Earlier turn: the refund policy for annual plans.'

/** The reference answer's must-include facts (from the golden set). */
export const REFERENCE_FACTS: { id: string; text: string }[] = [
  { id: 'f1', text: 'Monthly plans can be cancelled anytime' },
  { id: 'f2', text: 'No further charges after cancelling' },
  { id: 'f3', text: 'Partial months are not refunded' },
]

export interface Chunk {
  id: string
  doc: string
  text: string
  /** Reference facts this chunk contains. */
  facts: string[]
}

export const CHUNKS: Record<string, Chunk> = {
  cancel: { id: 'cancel', doc: 'doc 2 §3', text: 'Monthly plans can be cancelled at any time. Cancellation takes effect at the end of the billing period, with no further charges.', facts: ['f1', 'f2'] },
  partial: { id: 'partial', doc: 'doc 2 §4', text: 'Partial months are not refunded.', facts: ['f3'] },
  annual: { id: 'annual', doc: 'doc 1 §2', text: 'Annual plans can be refunded in full within 30 days of purchase.', facts: [] },
  export: { id: 'export', doc: 'doc 4 §1', text: 'Export your data from Settings → Data → Export.', facts: [] },
  pricing: { id: 'pricing', doc: 'doc 6 §1', text: 'Pro costs $16 a month, or $192 a year.', facts: [] },
  upgrade: { id: 'upgrade', doc: 'doc 3 §2', text: 'Upgrades apply immediately and are prorated.', facts: [] },
}

export type RetrievalId = 'good' | 'ranked' | 'missing'

/** Three retrievals for the same question: top 5 chunks, in rank order. */
export const RETRIEVALS: Record<RetrievalId, { label: string; note: string; chunks: string[] }> = {
  good: { label: 'Good', note: 'Both useful chunks, at the top', chunks: ['cancel', 'partial', 'annual', 'export', 'pricing'] },
  ranked: { label: 'Badly ranked', note: 'Both useful chunks, but low in the list', chunks: ['annual', 'export', 'cancel', 'pricing', 'partial'] },
  missing: { label: 'Missing a chunk', note: 'The partial-months chunk never came back', chunks: ['cancel', 'annual', 'export', 'pricing', 'upgrade'] },
}

/** A chunk is useful when it holds at least one reference fact (what the judge decides, given the reference). */
export const isUseful = (chunkId: string) => CHUNKS[chunkId].facts.length > 0

/** Context recall: the share of reference facts found anywhere in the retrieved chunks. */
export function contextRecall(chunks: string[]): { found: string[]; missing: string[]; score: number } {
  const have = new Set(chunks.flatMap((c) => CHUNKS[c].facts))
  const found = REFERENCE_FACTS.filter((f) => have.has(f.id)).map((f) => f.id)
  const missing = REFERENCE_FACTS.filter((f) => !have.has(f.id)).map((f) => f.id)
  return { found, missing, score: found.length / REFERENCE_FACTS.length }
}

/**
 * Context precision (RAGAS): at each rank holding a useful chunk, take precision@rank; average those.
 * Useful chunks at the top → 1; useful chunks buried → low.
 */
export function contextPrecision(chunks: string[]): { atUseful: { rank: number; precision: number }[]; score: number } {
  const atUseful: { rank: number; precision: number }[] = []
  let useful = 0
  chunks.forEach((c, i) => {
    if (!isUseful(c)) return
    useful++
    atUseful.push({ rank: i + 1, precision: useful / (i + 1) })
  })
  const score = atUseful.length ? atUseful.reduce((s, x) => s + x.precision, 0) / atUseful.length : 0
  return { atUseful, score }
}

// ── Answers: claims (faithfulness) and generated questions (relevancy) ───────

export type ClaimVerdict = 'supported' | 'unsupported' | 'contradicted'

export interface Claim {
  text: string
  verdict: ClaimVerdict
  /** The chunk that supports or contradicts it. */
  chunk?: string
  /** The judge's note. */
  note: string
}

export interface GeneratedAnswer {
  id: string
  label: string
  text: string
  claims: Claim[]
  /** Questions a model writes that this answer would answer, with their meaning-similarity to the real question. */
  reverseQuestions: { question: string; similarity: number }[]
}

export const ANSWERS: GeneratedAnswer[] = [
  {
    id: 'faithful',
    label: 'Faithful',
    text: 'Monthly plans can be cancelled anytime, and you won’t be charged again. Partial months aren’t refunded.',
    claims: [
      { text: 'Monthly plans can be cancelled anytime', verdict: 'supported', chunk: 'cancel', note: 'Stated in doc 2 §3.' },
      { text: 'You won’t be charged again', verdict: 'supported', chunk: 'cancel', note: '“with no further charges”' },
      { text: 'Partial months aren’t refunded', verdict: 'supported', chunk: 'partial', note: 'Stated in doc 2 §4.' },
    ],
    reverseQuestions: [
      { question: 'Can I cancel a monthly plan?', similarity: 0.93 },
      { question: 'Will I be charged after cancelling a monthly plan?', similarity: 0.9 },
      { question: 'Do monthly plans refund partial months?', similarity: 0.95 },
    ],
  },
  {
    id: 'madeup',
    label: 'Makes things up',
    text: 'Monthly plans can be cancelled anytime, and you won’t be charged again. You’ll get a prorated refund for unused days, within 5 business days.',
    claims: [
      { text: 'Monthly plans can be cancelled anytime', verdict: 'supported', chunk: 'cancel', note: 'Stated in doc 2 §3.' },
      { text: 'You won’t be charged again', verdict: 'supported', chunk: 'cancel', note: '“with no further charges”' },
      { text: 'You’ll get a prorated refund for unused days', verdict: 'contradicted', chunk: 'partial', note: 'The docs say the opposite.' },
      { text: 'Refunds arrive within 5 business days', verdict: 'unsupported', note: 'No chunk says this: invented.' },
    ],
    reverseQuestions: [
      { question: 'Can I cancel a monthly plan?', similarity: 0.93 },
      { question: 'Do I get money back if I cancel a monthly plan?', similarity: 0.91 },
      { question: 'How long do monthly refunds take?', similarity: 0.86 },
    ],
  },
  {
    id: 'outside',
    label: 'True, but not in the docs',
    text: 'Monthly plans can be cancelled anytime, with no further charges, and partial months aren’t refunded. You can also cancel from the mobile app.',
    claims: [
      { text: 'Monthly plans can be cancelled anytime', verdict: 'supported', chunk: 'cancel', note: 'Stated in doc 2 §3.' },
      { text: 'No further charges', verdict: 'supported', chunk: 'cancel', note: 'Stated in doc 2 §3.' },
      { text: 'Partial months aren’t refunded', verdict: 'supported', chunk: 'partial', note: 'Stated in doc 2 §4.' },
      { text: 'You can cancel from the mobile app', verdict: 'unsupported', note: 'Maybe true, but no retrieved chunk says it: it came from the model’s memory.' },
    ],
    reverseQuestions: [
      { question: 'Can I cancel a monthly plan?', similarity: 0.93 },
      { question: 'Are partial months refunded on monthly plans?', similarity: 0.94 },
      { question: 'Can I cancel from the mobile app?', similarity: 0.62 },
    ],
  },
  {
    id: 'offtopic',
    label: 'Answers the wrong question',
    text: 'Annual plans can be refunded in full within 30 days of purchase.',
    claims: [
      { text: 'Annual plans can be refunded in full within 30 days', verdict: 'supported', chunk: 'annual', note: 'Stated in doc 1 §2. True, and backed by the docs.' },
    ],
    reverseQuestions: [
      { question: 'What is the refund window for annual plans?', similarity: 0.48 },
      { question: 'Can I get a full refund on an annual plan?', similarity: 0.52 },
      { question: 'How long do I have to ask for an annual refund?', similarity: 0.41 },
    ],
  },
  {
    id: 'incomplete',
    label: 'Incomplete',
    text: 'Monthly plans can be cancelled anytime, with no further charges.',
    claims: [
      { text: 'Monthly plans can be cancelled anytime', verdict: 'supported', chunk: 'cancel', note: 'Stated in doc 2 §3.' },
      { text: 'No further charges', verdict: 'supported', chunk: 'cancel', note: 'Stated in doc 2 §3.' },
    ],
    reverseQuestions: [
      { question: 'Can I cancel a monthly plan?', similarity: 0.93 },
      { question: 'Will I be charged after cancelling a monthly plan?', similarity: 0.9 },
      { question: 'When does a monthly cancellation take effect?', similarity: 0.82 },
    ],
  },
]

export const answerById = (id: string) => ANSWERS.find((a) => a.id === id)!

/** Faithfulness: supported claims ÷ all claims. Contradicted and unsupported claims both count against it. */
export function faithfulness(answer: GeneratedAnswer): { supported: number; total: number; score: number } {
  const supported = answer.claims.filter((c) => c.verdict === 'supported').length
  return { supported, total: answer.claims.length, score: supported / answer.claims.length }
}

/** Answer relevancy (RAGAS): the average similarity between the real question and the questions the answer fits. */
export function answerRelevancy(answer: GeneratedAnswer): number {
  return answer.reverseQuestions.reduce((s, q) => s + q.similarity, 0) / answer.reverseQuestions.length
}

// ── Diagnosis: which metric drops tells you where to look ────────────────────

export interface DiagnosisCase {
  id: string
  label: string
  retrieval: RetrievalId
  answer: string
  culprit: 'none' | 'generator' | 'retriever' | 'both'
  diagnosis: string
  fix: string
}

export const CASES: DiagnosisCase[] = [
  { id: 'healthy', label: 'Healthy', retrieval: 'good', answer: 'faithful', culprit: 'none', diagnosis: 'Every score is high.', fix: 'Nothing to fix. Keep the scores on a dashboard.' },
  { id: 'hallucination', label: 'Made things up', retrieval: 'good', answer: 'madeup', culprit: 'generator', diagnosis: 'Retrieval was perfect, but the answer adds claims the chunks don’t support.', fix: 'Tell the model to answer only from the chunks and cite them; flag low-faithfulness answers.' },
  { id: 'missed', label: 'Retrieval missed', retrieval: 'missing', answer: 'incomplete', culprit: 'retriever', diagnosis: 'The answer is faithful to what it got, but a needed fact never reached it.', fix: 'Fix retrieval: chunking, top-k, or hybrid search.' },
  { id: 'followup', label: 'Misread follow-up', retrieval: 'ranked', answer: 'offtopic', culprit: 'both', diagnosis: '“Monthly ones” wasn’t understood: the annual chunk ranked first, and the answer is about annual plans.', fix: 'Rewrite follow-ups into standalone questions before retrieval.' },
]

export function caseScores(c: DiagnosisCase) {
  const answer = answerById(c.answer)
  const chunks = RETRIEVALS[c.retrieval].chunks
  return {
    faithfulness: faithfulness(answer).score,
    answerRelevancy: answerRelevancy(answer),
    contextPrecision: contextPrecision(chunks).score,
    contextRecall: contextRecall(chunks).score,
  }
}

/** Below this, a score shows as a problem. */
export const HEALTHY = 0.8
