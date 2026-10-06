// ── LLM-as-a-judge, explained ────────────────────────────────────────────────
// Pure, deterministic model of how an LLM judge turns a rubric into a score, how noisy it is, and how
// to check it against human labels. Shared by the LLM Judge Visualizer and its tests. The verdicts are
// worked examples written down in advance — the visualizer teaches the mechanics, it does not call a model.

export type Scale = '0-1' | '1-5' | 'pass-fail'

export interface Criterion {
  id: string
  label: string
  /** Relative importance; a criterion with weight 3 counts three times as much as weight 1. */
  weight: number
  /** What the judge is told this criterion means. */
  definition: string
}

export interface Verdict {
  pass: boolean
  /** The judge's one-line reasoning for this criterion. */
  reason: string
}

export interface CandidateAnswer {
  id: string
  label: string
  text: string
  verdicts: Record<string, Verdict>
}

export const QUESTION = 'What about monthly ones?'
export const CONTEXT_NOTE = 'Earlier turn: the refund policy for annual plans.'
export const REFERENCE = 'Monthly plans can be cancelled anytime, with no further charges. Partial months are not refunded. [doc 2]'

// ── The golden dataset (the answer key) ──────────────────────────────────────

/** One golden example: what the judge compares an answer against. */
export const GOLDEN_EXAMPLE = {
  id: 'refund-017',
  conversation: ['Leo: Can I get a refund on my annual plan?', 'Bot: Yes, within 30 days of purchase. [doc 1]'],
  question: QUESTION,
  reference: REFERENCE,
  mustInclude: ['cancel anytime', 'no further charges', 'partial months not refunded'],
  source: 'doc 2 · Billing policy, §3 Monthly plans',
  tags: ['follow-up question', 'billing'],
  writtenBy: 'Support lead, reviewed by a second person',
}

/** How a golden dataset gets built, step by step. */
export const GOLDEN_STEPS: { title: string; detail: string }[] = [
  { title: 'Collect real questions', detail: 'From production logs and support tickets, not invented at a desk. Short on real traffic? A model can draft questions from the docs, but a person keeps or rejects each one.' },
  { title: 'Pick a balanced mix', detail: 'Common questions, hard ones, follow-ups, and questions the docs can’t answer (the right reply is “I don’t know”). 50–200 to start.' },
  { title: 'Experts write the answer key', detail: 'Someone who knows the domain writes the reference answer from the source docs, with the facts it must include. A second person reviews it.' },
  { title: 'People label sample answers', detail: 'Two people mark real model answers pass or fail on their own, then settle disagreements. These labels are what you check the judge against.' },
  { title: 'Split, version, keep adding', detail: 'One part to tune the judge, a held-out part to test it. Version the set, and add every failure you find in production.' },
]

export const CRITERIA: Criterion[] = [
  { id: 'correct', label: 'Correct', weight: 3, definition: 'Agrees with the reference answer; nothing contradicts it' },
  { id: 'grounded', label: 'Cites a source', weight: 2, definition: 'Cites a document that supports what it says' },
  { id: 'complete', label: 'Complete', weight: 1, definition: 'Includes every must-include fact' },
  { id: 'concise', label: 'Concise', weight: 1, definition: 'No filler beyond what answers the question' },
]

export const ANSWERS: CandidateAnswer[] = [
  {
    id: 'grounded',
    label: 'Grounded',
    text: 'Monthly plans can be cancelled anytime, and you won’t be charged again. Partial months aren’t refunded. [doc 2]',
    verdicts: {
      correct: { pass: true, reason: 'Matches the reference on both points.' },
      grounded: { pass: true, reason: 'Cites doc 2, which contains the policy.' },
      complete: { pass: true, reason: 'Covers cancelling and partial months.' },
      concise: { pass: true, reason: 'Two sentences, nothing extra.' },
    },
  },
  {
    id: 'uncited',
    label: 'No citation',
    text: 'Monthly plans can be cancelled anytime, and you won’t be charged again. Partial months aren’t refunded.',
    verdicts: {
      correct: { pass: true, reason: 'Matches the reference.' },
      grounded: { pass: false, reason: 'No source: the user can’t check it.' },
      complete: { pass: true, reason: 'Covers both points.' },
      concise: { pass: true, reason: 'Short and direct.' },
    },
  },
  {
    id: 'guess',
    label: 'Confident guess',
    text: 'Yes! Monthly plans get a full refund within 14 days of each payment.',
    verdicts: {
      correct: { pass: false, reason: 'Contradicts the reference: there is no 14-day refund.' },
      grounded: { pass: false, reason: 'No source, because none says this.' },
      complete: { pass: false, reason: 'Says nothing about cancelling.' },
      concise: { pass: true, reason: 'Short — but short and wrong.' },
    },
  },
  {
    id: 'padded',
    label: 'Padded',
    text: 'Great question! Refund policies can be confusing, and we totally understand. Here at Cloudly we value every customer. To answer: monthly plans can be cancelled anytime with no further charges, and partial months aren’t refunded [doc 2]. We hope this helps, and thanks for being a customer!',
    verdicts: {
      correct: { pass: true, reason: 'The facts are right.' },
      grounded: { pass: true, reason: 'Cites doc 2.' },
      complete: { pass: true, reason: 'Both points are there.' },
      concise: { pass: false, reason: 'Three sentences of filler around one of substance.' },
    },
  },
  {
    id: 'dontknow',
    label: 'Wrong “don’t know”',
    text: 'The documents don’t say how refunds work for monthly plans.',
    verdicts: {
      correct: { pass: false, reason: 'They do: doc 2 states the policy. A false “don’t know” is still wrong.' },
      grounded: { pass: false, reason: 'Cites nothing.' },
      complete: { pass: false, reason: 'No answer at all.' },
      concise: { pass: true, reason: 'Short.' },
    },
  },
]

/** Weighted share of enabled criteria the answer passes (0–1). No criteria enabled → 0. */
export function rubricScore(answer: CandidateAnswer, enabled: Record<string, boolean>, criteria = CRITERIA): number {
  const active = criteria.filter((c) => enabled[c.id])
  const total = active.reduce((s, c) => s + c.weight, 0)
  if (total === 0) return 0
  return active.reduce((s, c) => s + (answer.verdicts[c.id]?.pass ? c.weight : 0), 0) / total
}

/** The prompt the judge model receives: the golden example, the answer, and the rubric. */
export function judgePrompt(answer: CandidateAnswer, enabled: Record<string, boolean>, criteria = CRITERIA): string {
  const rubric = criteria.filter((c) => enabled[c.id]).map((c) => `- ${c.id}: ${c.definition}`).join('\n')
  return [
    `Question: "${QUESTION}"`,
    `Reference answer: ${REFERENCE}`,
    `Answer to grade: ${answer.text}`,
    'For each criterion, reply pass or fail with a one-line reason:',
    rubric,
  ].join('\n')
}

/** What the judge model sends back: one verdict per criterion, as JSON. Weights are applied by code, not the model. */
export function judgeReply(answer: CandidateAnswer, enabled: Record<string, boolean>, criteria = CRITERIA): string {
  const lines = criteria
    .filter((c) => enabled[c.id])
    .map((c) => `  "${c.id}": { "pass": ${answer.verdicts[c.id].pass}, "reason": "${answer.verdicts[c.id].reason}" }`)
  return `{\n${lines.join(',\n')}\n}`
}

export const PASS_MARK = 0.75

/** The same 0–1 result expressed on each scale. */
export function onScale(x: number, scale: Scale): string {
  if (scale === '0-1') return x.toFixed(2)
  if (scale === '1-5') return String(Math.round(1 + 4 * x))
  return x >= PASS_MARK ? 'Pass' : 'Fail'
}

// ── Consistency ──────────────────────────────────────────────────────────────

/** Five runs of the same judge on the same answer (1–5). Unpinned: sampling noise; pinned: stable. */
export const REPEAT_RUNS = { unpinned: [4, 5, 4, 3, 4], pinned: [4, 4, 4, 4, 4] }

export function spread(xs: number[]): { mean: number; min: number; max: number } {
  const mean = xs.reduce((s, x) => s + x, 0) / xs.length
  return { mean, min: Math.min(...xs), max: Math.max(...xs) }
}

/**
 * Pairwise comparison with position bias: this (deliberately biased) judge prefers whichever answer it reads
 * first when the two are close. Fair protocol: judge both orders; if the winner changes, call it a tie.
 */
export function pairwise(first: 'A' | 'B'): { winner: 'A' | 'B' } {
  return { winner: first }
}
export function swapConsistentVerdict(): 'A' | 'B' | 'tie' {
  const ab = pairwise('A').winner
  const ba = pairwise('B').winner
  return ab === ba ? ab : 'tie'
}

// ── Calibration against human labels ─────────────────────────────────────────

export interface LabeledItem {
  id: string
  answer: string
  human: boolean
}

/** Twelve answers a person labeled pass/fail. */
export const LABELED: LabeledItem[] = [
  { id: 'q1', answer: 'Cancel anytime; partial months not refunded [doc 2]', human: true },
  { id: 'q2', answer: 'Annual plans: full refund within 30 days [doc 1]', human: true },
  { id: 'q3', answer: 'Export: Settings → Data → Export [doc 4]', human: true },
  { id: 'q4', answer: 'Monthly plans refunded within 14 days', human: false },
  { id: 'q5', answer: 'Upgrades apply immediately, prorated [doc 3]', human: true },
  { id: 'q6', answer: 'Export is free (the docs don’t say)', human: false },
  { id: 'q7', answer: 'Pro is $192/year [doc 6]', human: true },
  { id: 'q8', answer: 'Downgrades: next billing date [doc 3]', human: true },
  { id: 'q9', answer: '“I think annual refunds are 60 days”', human: false },
  { id: 'q10', answer: 'Monthly: cancel anytime', human: true },
  { id: 'q11', answer: 'Long, friendly, correct, cited', human: true },
  { id: 'q12', answer: '“The docs don’t cover that” (they do)', human: false },
]

export type JudgeVersion = 'v1' | 'v2' | 'lazy'

export const JUDGE_VERSIONS: Record<JudgeVersion, { label: string; note: string; verdicts: Record<string, boolean> }> = {
  v1: {
    label: 'Rubric v1',
    note: 'Lenient: rewards confident tone, punishes short answers',
    verdicts: { q1: true, q2: true, q3: true, q4: true, q5: true, q6: true, q7: true, q8: true, q9: false, q10: false, q11: true, q12: false },
  },
  v2: {
    label: 'Rubric v2',
    note: 'Adds “a guess scores 0” and “short is fine if complete”',
    verdicts: { q1: true, q2: true, q3: true, q4: false, q5: true, q6: false, q7: true, q8: true, q9: false, q10: true, q11: true, q12: true },
  },
  lazy: {
    label: 'Lazy judge',
    note: 'Says “pass” to everything',
    verdicts: Object.fromEntries(LABELED.map((i) => [i.id, true])),
  },
}

export interface Agreement {
  /** Both pass / human pass, judge fail / human fail, judge pass / both fail. */
  bothPass: number
  missed: number
  falsePass: number
  bothFail: number
  agreement: number
  /** Agreement expected by chance: a judge guessing at random, but saying "pass" as often as this one does. */
  chance: number
  /** Cohen's kappa: agreement corrected for what chance alone would give. */
  kappa: number
  disagreements: string[]
}

export function agreementWithHumans(judge: Record<string, boolean>, items = LABELED): Agreement {
  let bothPass = 0, missed = 0, falsePass = 0, bothFail = 0
  const disagreements: string[] = []
  for (const it of items) {
    const j = judge[it.id]
    if (it.human && j) bothPass++
    else if (it.human && !j) { missed++; disagreements.push(it.id) }
    else if (!it.human && j) { falsePass++; disagreements.push(it.id) }
    else bothFail++
  }
  const n = items.length
  const po = (bothPass + bothFail) / n
  const humanPass = (bothPass + missed) / n
  const judgePass = (bothPass + falsePass) / n
  const pe = humanPass * judgePass + (1 - humanPass) * (1 - judgePass)
  const kappa = pe === 1 ? 0 : (po - pe) / (1 - pe)
  return { bothPass, missed, falsePass, bothFail, agreement: po, chance: pe, kappa, disagreements }
}

// ── Synthetic test data ──────────────────────────────────────────────────────

/** The document chunk a model drafts test questions from. */
export const SOURCE_CHUNK = {
  source: 'doc 2 · Billing policy, §3 Monthly plans',
  text: 'Monthly plans can be cancelled at any time. Cancellation takes effect at the end of the current billing period. Partial months are not refunded.',
}

export interface SyntheticQuestion {
  question: string
  /** How it was generated. */
  method: string
  keep: boolean
  /** The reviewer's note. */
  review: string
}

/** What a model drafts from SOURCE_CHUNK, and what a person decides about each one. */
export const SYNTHETIC_QUESTIONS: SyntheticQuestion[] = [
  { question: 'Can monthly plans be cancelled at any time?', method: 'From the doc', keep: false, review: 'Copies the doc’s wording, so retrieval finds it too easily. Reworded to sound like a user.' },
  { question: 'If I cancel halfway through the month, do I get the rest back?', method: 'Reworded like a user', keep: true, review: 'Kept: how real users ask.' },
  { question: 'Is there a 14-day refund on monthly plans?', method: 'Trap', keep: true, review: 'Kept: the right answer is “no”. Catches confident guesses.' },
  { question: 'Can I pause my monthly plan instead?', method: '“Docs don’t say”', keep: true, review: 'Kept: the right answer is “I don’t know”.' },
  { question: 'Explain the monthly cancellation policy.', method: 'From the doc', keep: false, review: 'No user writes like this. Rejected.' },
]

/** Judge pass rates on real vs. synthetic questions: a big gap means the synthetic set is too easy. */
export const REAL_VS_SYNTHETIC = { real: 0.78, synthetic: 0.94 }

// ── Statistics ───────────────────────────────────────────────────────────────

/** Standard deviation of these runs: the square root of the average squared distance from the mean. */
export function stdDev(xs: number[]): number {
  const mean = xs.reduce((s, x) => s + x, 0) / xs.length
  return Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / xs.length)
}

/** How much the average of n runs wobbles: one run's standard deviation ÷ √n. */
export function stdDevOfAverage(sd: number, n: number): number {
  return sd / Math.sqrt(n)
}

/**
 * Margin of error for a proportion p measured on n items: 2 × √(p(1 − p) ÷ n). The 2 (1.96, rounded) gives about
 * 95% confidence. Normal approximation: rough for small n, which is the point of showing it.
 */
export function marginOfError(p: number, n: number): number {
  return 2 * Math.sqrt((p * (1 - p)) / n)
}

// ── Judge biases ─────────────────────────────────────────────────────────────

export const JUDGE_BIASES: { name: string; what: string; fix: string }[] = [
  { name: 'Position', what: 'prefers the answer it reads first', fix: 'judge both orders' },
  { name: 'Length', what: 'prefers longer answers', fix: 'a “concise” criterion; compare equal lengths' },
  { name: 'Self-preference', what: 'prefers answers from its own model family', fix: 'judge with a different model family' },
  { name: 'Leniency', what: 'passes too much, often from confident tone', fix: 'strict rubric, checked against people' },
]
