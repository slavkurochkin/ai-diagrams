import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import JudgePanel from './JudgePanel'

describe('JudgePanel', () => {
  it('opens on the answer key: one golden example and how the golden set is built', () => {
    const html = renderToStaticMarkup(<JudgePanel open onClose={() => {}} />)
    expect(html).toContain('One golden example')
    expect(html).toContain('Reference answer')
    for (const n of [1, 2, 3, 4, 5]) expect(html).toContain(`data-step="${n}"`)
    expect(html).toContain('aria-label="Next step"')
  })

  it('grading tab: every rubric criterion and a score', () => {
    const html = renderToStaticMarkup(<JudgePanel open onClose={() => {}} initialTab="grade" />)
    expect(html).toContain('LLM Judge Visualizer')
    for (const c of ['Correct', 'Cites a source', 'Complete', 'Concise']) expect(html).toContain(`aria-label="Criterion: ${c}"`)
    expect(html).toContain('passed weight ÷ total = 7 ÷ 7 = 1.00')
    expect(html).toContain('aria-label="Answer: Confident guess"')
    expect(html).toContain('aria-label="Scale: Pass / Fail"')
    expect(html).toContain('aria-label="Show the judge&#x27;s prompt"')
  })

  it('trust tab: agreement, chance, and the kappa formula', () => {
    const html = renderToStaticMarkup(<JudgePanel open onClose={() => {}} initialTab="trust" />)
    expect(html).toContain('(75% − 58%) ÷ (100% − 58%) = 0.40')
  })

  it('renders nothing when closed', () => {
    expect(renderToStaticMarkup(<JudgePanel open={false} onClose={() => {}} />)).toBe('')
  })
})
