import { describe, expect, it } from 'vitest'
import {
  answerById,
  answerRelevancy,
  CASES,
  caseScores,
  contextPrecision,
  contextRecall,
  faithfulness,
  HEALTHY,
  RETRIEVALS,
} from './generationMetrics'

describe('faithfulness', () => {
  it('counts supported claims; contradicted and invented ones count against it', () => {
    expect(faithfulness(answerById('faithful')).score).toBe(1)
    expect(faithfulness(answerById('madeup'))).toEqual({ supported: 2, total: 4, score: 0.5 })
  })

  it('measures “backed by the chunks”, not truth: a true fact from memory still costs, an off-topic answer can score 1', () => {
    expect(faithfulness(answerById('outside')).score).toBe(0.75)
    expect(faithfulness(answerById('offtopic')).score).toBe(1)
  })
})

describe('answer relevancy', () => {
  it('is the average similarity of the questions the answer fits', () => {
    expect(answerRelevancy(answerById('faithful'))).toBeCloseTo(0.927, 3)
    expect(answerRelevancy(answerById('offtopic'))).toBeCloseTo(0.47, 2)
  })

  it('does not check truth: a made-up answer can still be relevant', () => {
    expect(answerRelevancy(answerById('madeup'))).toBeGreaterThan(HEALTHY)
  })
})

describe('context recall and precision', () => {
  it('recall: share of reference facts found in the chunks', () => {
    expect(contextRecall(RETRIEVALS.good.chunks).score).toBe(1)
    expect(contextRecall(RETRIEVALS.missing.chunks)).toMatchObject({ missing: ['f3'] })
    expect(contextRecall(RETRIEVALS.missing.chunks).score).toBeCloseTo(2 / 3)
  })

  it('precision: average precision at each useful chunk, so ranking matters', () => {
    expect(contextPrecision(RETRIEVALS.good.chunks).score).toBe(1)
    const ranked = contextPrecision(RETRIEVALS.ranked.chunks)
    expect(ranked.atUseful).toEqual([{ rank: 3, precision: 1 / 3 }, { rank: 5, precision: 2 / 5 }])
    expect(ranked.score).toBeCloseTo(0.367, 3)
    expect(contextRecall(RETRIEVALS.ranked.chunks).score).toBe(1) // same chunks found, worse order
  })
})

describe('diagnosis', () => {
  const low = (id: string) => {
    const s = caseScores(CASES.find((c) => c.id === id)!)
    return Object.entries(s).filter(([, v]) => v < HEALTHY).map(([k]) => k)
  }

  it('each failure shows up in the metric that points at its cause', () => {
    expect(low('healthy')).toEqual([])
    expect(low('hallucination')).toEqual(['faithfulness'])
    expect(low('missed')).toEqual(['contextRecall'])
    expect(low('followup')).toEqual(['answerRelevancy', 'contextPrecision'])
  })
})
