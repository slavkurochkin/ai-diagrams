// ── Word error rate ──────────────────────────────────────────────────────────
// Pure WER / CER / entity-error computation shared by the WER visualizer panel and
// the ASR Eval node's playback overlay. Alignment is a word-level Levenshtein with a
// backtrace, so every error is attributable to a specific substitution, deletion, or
// insertion — which is the point when explaining the metric.

export type Normalization = 'standard' | 'basic' | 'none'

export type AlignOpType = 'match' | 'sub' | 'del' | 'ins'

export interface AlignOp {
  type: AlignOpType
  /** Reference word (absent for insertions). */
  ref?: string
  /** Transcript word (absent for deletions). */
  hyp?: string
  /** Index into the normalised reference tokens (absent for insertions). */
  refIndex?: number
}

export interface EntityResult {
  phrase: string
  /** Whether the phrase occurs in the normalised reference at all. */
  found: boolean
  /** Every reference word of the phrase was transcribed exactly. */
  correct: boolean
}

export interface WerResult {
  refTokens: string[]
  hypTokens: string[]
  ops: AlignOp[]
  substitutions: number
  deletions: number
  insertions: number
  /** N — number of reference words. */
  refLength: number
  /** (S + D + I) / N; null when the reference is empty. */
  wer: number | null
  /** Character error rate over the normalised text; null when the reference is empty. */
  cer: number | null
  entities: EntityResult[]
  /** Share of found entities with any error; null when no entity was found in the reference. */
  entityErrorRate: number | null
}

// ── Normalisation ────────────────────────────────────────────────────────────

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']

/** 0–9999 as spoken words ("42" → "forty two"); larger numbers are read digit by digit. */
export function numberToWords(n: number): string {
  if (!Number.isInteger(n) || n < 0) return String(n)
  if (n < 20) return ONES[n]
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ` ${ONES[n % 10]}` : '')
  if (n < 1000) {
    const rest = n % 100
    return `${ONES[Math.floor(n / 100)]} hundred${rest ? ` ${numberToWords(rest)}` : ''}`
  }
  if (n < 10000) {
    const rest = n % 1000
    return `${numberToWords(Math.floor(n / 1000))} thousand${rest ? ` ${numberToWords(rest)}` : ''}`
  }
  return String(n).split('').map((d) => ONES[Number(d)]).join(' ')
}

/** Spoken form of a clock time: "3:30" → "three thirty", "3:05" → "three oh five", "3:00" → "three". */
function timeToWords(hours: string, minutes: string): string {
  const h = numberToWords(Number(hours))
  const m = Number(minutes)
  if (m === 0) return h
  return m < 10 ? `${h} oh ${ONES[m]}` : `${h} ${numberToWords(m)}`
}

const FILLERS = new Set(['um', 'uh', 'umm', 'uhh', 'erm', 'er', 'ah', 'hmm', 'mm', 'mhm'])

/**
 * Splits text into comparable words.
 * - `none`: whitespace split only — every formatting difference counts as an error.
 * - `basic`: lowercase and strip punctuation.
 * - `standard`: basic, plus numbers and clock times as words and filler words removed —
 *   so "3:30" and "three thirty" compare equal.
 */
export function normalize(text: string, mode: Normalization): string[] {
  if (mode === 'none') return text.trim().split(/\s+/).filter(Boolean)
  let t = text.toLowerCase()
  if (mode === 'standard') {
    t = t
      .replace(/\b(\d{1,2}):(\d{2})\b/g, (_, h: string, m: string) => ` ${timeToWords(h, m)} `)
      .replace(/\b\d+\b/g, (d) => ` ${numberToWords(Number(d))} `)
  }
  t = t.replace(/[^\p{L}\p{N}'\s]/gu, ' ').replace(/(^|\s)'+|'+(\s|$)/g, ' ')
  const words = t.split(/\s+/).filter(Boolean)
  return mode === 'standard' ? words.filter((w) => !FILLERS.has(w)) : words
}

// ── Alignment ────────────────────────────────────────────────────────────────

/**
 * Minimum-edit alignment of two token sequences.
 *
 * When several alignments need the same number of edits, the one that substitutes
 * similar-looking words wins ("thirty" → "thirteen", not "on" → "thirteen"): each
 * substitution carries a tiny tie-break cost from the words' character distance.
 * That cost is far below 1, so it never trades an extra edit for a better pairing.
 */
export function align(ref: string[], hyp: string[]): AlignOp[] {
  const n = ref.length
  const m = hyp.length
  const TIE_BREAK = 1e-6
  const subCost = (a: string, b: string) =>
    a === b ? 0 : 1 + TIE_BREAK * (editDistance(a, b) / Math.max(a.length, b.length))

  type Step = 'diag' | 'up' | 'left'
  const cost: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  const step: Step[][] = Array.from({ length: n + 1 }, () => new Array<Step>(m + 1).fill('diag'))
  for (let i = 1; i <= n; i++) { cost[i][0] = i; step[i][0] = 'up' }
  for (let j = 1; j <= m; j++) { cost[0][j] = j; step[0][j] = 'left' }
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const diag = cost[i - 1][j - 1] + subCost(ref[i - 1], hyp[j - 1])
      const up = cost[i - 1][j] + 1
      const left = cost[i][j - 1] + 1
      // Ties prefer the diagonal (match / substitution), then deletion.
      if (diag <= up && diag <= left) { cost[i][j] = diag; step[i][j] = 'diag' }
      else if (up <= left) { cost[i][j] = up; step[i][j] = 'up' }
      else { cost[i][j] = left; step[i][j] = 'left' }
    }
  }

  const ops: AlignOp[] = []
  let i = n
  let j = m
  while (i > 0 || j > 0) {
    const s = step[i][j]
    if (s === 'diag') {
      ops.push({ type: ref[i - 1] === hyp[j - 1] ? 'match' : 'sub', ref: ref[i - 1], hyp: hyp[j - 1], refIndex: i - 1 })
      i--
      j--
    } else if (s === 'up') {
      ops.push({ type: 'del', ref: ref[i - 1], refIndex: i - 1 })
      i--
    } else {
      ops.push({ type: 'ins', hyp: hyp[j - 1] })
      j--
    }
  }
  return ops.reverse()
}

function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1), prev[j] + 1, cur[j - 1] + 1)
    }
    prev = cur
  }
  return prev[b.length]
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Comma-separated entity phrases ("three thirty, tuesday") → trimmed list. */
export function parseEntities(raw: string): string[] {
  return raw.split(',').map((e) => e.trim()).filter(Boolean)
}

export function computeWer(
  reference: string,
  transcript: string,
  options: { normalization?: Normalization; entities?: string[] } = {},
): WerResult {
  const mode = options.normalization ?? 'standard'
  const refTokens = normalize(reference, mode)
  const hypTokens = normalize(transcript, mode)
  const ops = align(refTokens, hypTokens)

  const substitutions = ops.filter((o) => o.type === 'sub').length
  const deletions = ops.filter((o) => o.type === 'del').length
  const insertions = ops.filter((o) => o.type === 'ins').length
  const refLength = refTokens.length
  const wer = refLength === 0 ? null : (substitutions + deletions + insertions) / refLength

  const refText = refTokens.join(' ')
  const cer = refText.length === 0 ? null : editDistance(refText, hypTokens.join(' ')) / refText.length

  // An entity is correct only if every one of its reference words was matched exactly.
  const matchedRef = new Set(ops.filter((o) => o.type === 'match').map((o) => o.refIndex))
  const entities = (options.entities ?? []).map((phrase): EntityResult => {
    const words = normalize(phrase, mode)
    if (words.length === 0) return { phrase, found: false, correct: false }
    for (let start = 0; start + words.length <= refTokens.length; start++) {
      if (words.every((w, k) => refTokens[start + k] === w)) {
        const correct = words.every((_, k) => matchedRef.has(start + k))
        return { phrase, found: true, correct }
      }
    }
    return { phrase, found: false, correct: false }
  })
  const found = entities.filter((e) => e.found)
  const entityErrorRate = found.length === 0 ? null : found.filter((e) => !e.correct).length / found.length

  return { refTokens, hypTokens, ops, substitutions, deletions, insertions, refLength, wer, cer, entities, entityErrorRate }
}

/** "28.6%" — or "—" when undefined. */
export function formatRate(rate: number | null): string {
  return rate === null ? '—' : `${(rate * 100).toFixed(1)}%`
}
