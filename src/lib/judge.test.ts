import { describe, expect, it } from 'vitest'
import {
  agreementWithHumans,
  ANSWERS,
  CRITERIA,
  JUDGE_VERSIONS,
  LABELED,
  onScale,
  REPEAT_RUNS,
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
    expect(LABELED.filter((i) => i.human)).toHaveLength(8)
  })

  it('computes kappa from the 2×2 table', () => {
    const v1 = agreementWithHumans(JUDGE_VERSIONS.v1.verdicts)
    expect([v1.bothPass, v1.missed, v1.falsePass, v1.bothFail]).toEqual([7, 1, 2, 2])
    // po = 9/12; humans pass 8/12, judge 9/12 → pe = 8/12·9/12 + 4/12·3/12 = 0.5833 → κ = 0.4
    expect(v1.kappa).toBeCloseTo(0.4)
  })
})
