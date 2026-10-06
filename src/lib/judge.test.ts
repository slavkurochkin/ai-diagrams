import { describe, expect, it } from 'vitest'
import {
  agreementWithHumans,
  ANSWERS,
  CRITERIA,
  JUDGE_VERSIONS,
  LABELED,
  onScale,
  REPEAT_RUNS,
  judgePrompt,
  JUDGE_BIASES,
  marginOfError,
  REAL_VS_SYNTHETIC,
  stdDev,
  stdDevOfAverage,
  SYNTHETIC_QUESTIONS,
  judgeReply,
  rubricScore,
  spread,
  swapConsistentVerdict,
} from './judge'

const all = Object.fromEntries(CRITERIA.map((c) => [c.id, true]))
const answer = (id: string) => ANSWERS.find((a) => a.id === id)!

describe('rubric scoring', () => {
  it('weights criteria: a missing citation costs 2 of 7, padding 1 of 7, a guess almost everything', () => {
    expect(rubricScore(answer('grounded'), all)).toBe(1)
    expect(rubricScore(answer('uncited'), all)).toBeCloseTo(5 / 7)
    expect(rubricScore(answer('padded'), all)).toBeCloseTo(6 / 7)
    expect(rubricScore(answer('guess'), all)).toBeCloseTo(1 / 7)
    expect(rubricScore(answer('dontknow'), all)).toBeCloseTo(1 / 7)
  })

  it('only enabled criteria count', () => {
    expect(rubricScore(answer('padded'), { ...all, concise: false })).toBe(1)
    expect(rubricScore(answer('guess'), {})).toBe(0)
  })

  it('expresses one result on every scale', () => {
    const x = rubricScore(answer('uncited'), all) // 0.714
    expect(onScale(x, '0-1')).toBe('0.71')
    expect(onScale(x, '1-5')).toBe('4')
    expect(onScale(x, 'pass-fail')).toBe('Fail') // just under the 0.75 pass mark
    expect(onScale(rubricScore(answer('padded'), all), 'pass-fail')).toBe('Pass')
  })
})

describe('what the judge sees', () => {
  it('prompts with the golden example and the enabled rubric, and replies with one verdict per criterion', () => {
    const prompt = judgePrompt(answer('uncited'), { ...all, concise: false })
    expect(prompt).toContain('Reference answer:')
    expect(prompt).toContain('- grounded: Cites a document that supports what it says')
    expect(prompt).not.toContain('concise')
    const reply = JSON.parse(judgeReply(answer('uncited'), all))
    expect(Object.keys(reply)).toEqual(['correct', 'grounded', 'complete', 'concise'])
    expect(reply.grounded.pass).toBe(false)
  })
})

describe('consistency', () => {
  it('an unpinned judge spreads; a pinned one does not', () => {
    expect(spread(REPEAT_RUNS.unpinned)).toEqual({ mean: 4, min: 3, max: 5 })
    expect(spread(REPEAT_RUNS.pinned)).toEqual({ mean: 4, min: 4, max: 4 })
  })

  it('a position-biased pairwise judge becomes a tie once both orders are judged', () => {
    expect(swapConsistentVerdict()).toBe('tie')
  })
})

describe('agreement with humans', () => {
  it('v1 agrees on 9 of 12, v2 on 11 of 12', () => {
    const v1 = agreementWithHumans(JUDGE_VERSIONS.v1.verdicts)
    const v2 = agreementWithHumans(JUDGE_VERSIONS.v2.verdicts)
    expect(v1.agreement).toBeCloseTo(9 / 12)
    expect(v1.disagreements).toEqual(['q4', 'q6', 'q10'])
    expect(v2.agreement).toBeCloseTo(11 / 12)
    expect(v2.disagreements).toEqual(['q12'])
    expect(v2.kappa).toBeGreaterThan(v1.kappa)
  })

  it('a judge that passes everything looks 67% "accurate" but has kappa 0', () => {
    const lazy = agreementWithHumans(JUDGE_VERSIONS.lazy.verdicts)
    expect(lazy.agreement).toBeCloseTo(8 / 12)
    expect(lazy.kappa).toBeCloseTo(0)
    expect(lazy.chance).toBeCloseTo(lazy.agreement) // no better than chance
    expect(LABELED.filter((i) => i.human)).toHaveLength(8)
  })

  it('computes kappa from the 2×2 table', () => {
    const v1 = agreementWithHumans(JUDGE_VERSIONS.v1.verdicts)
    expect([v1.bothPass, v1.missed, v1.falsePass, v1.bothFail]).toEqual([7, 1, 2, 2])
    // po = 9/12; humans pass 8/12, judge 9/12 → pe = 8/12·9/12 + 4/12·3/12 = 0.5833 → κ = 0.4
    expect(v1.chance).toBeCloseTo(7 / 12)
    expect(v1.kappa).toBeCloseTo(0.4)
  })
})

describe('synthetic data and statistics', () => {
  it('a person keeps or rejects every synthetic question', () => {
    expect(SYNTHETIC_QUESTIONS.filter((q) => q.keep)).toHaveLength(3)
    expect(SYNTHETIC_QUESTIONS.every((q) => q.review.length > 0)).toBe(true)
    expect(REAL_VS_SYNTHETIC.synthetic).toBeGreaterThan(REAL_VS_SYNTHETIC.real)
  })

  it('standard deviation: noisy runs ≈ 0.63, pinned runs 0; averaging 5 runs shrinks it to ≈ 0.28', () => {
    expect(stdDev(REPEAT_RUNS.unpinned)).toBeCloseTo(Math.sqrt(0.4), 5) // distances 0,1,0,1,0 → squares average 0.4
    expect(stdDev(REPEAT_RUNS.pinned)).toBe(0)
    expect(stdDevOfAverage(stdDev(REPEAT_RUNS.unpinned), 5)).toBeCloseTo(0.283, 3)
  })

  it('margin of error shrinks with more labels', () => {
    expect(marginOfError(0.75, 12)).toBeCloseTo(0.25, 2) // ±25%
    expect(marginOfError(0.75, 200)).toBeCloseTo(0.061, 2) // ±6%
    expect(marginOfError(11 / 12, 12)).toBeCloseTo(0.16, 2) // ±16%: 76%–100%
    expect(marginOfError(11 / 12, 200)).toBeCloseTo(0.039, 2) // ±4%
  })

  it('lists the common judge biases with a fix each', () => {
    expect(JUDGE_BIASES.map((b) => b.name)).toEqual(['Position', 'Length', 'Self-preference', 'Leniency'])
  })
})
