import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import JudgePanel from './JudgePanel'

describe('JudgePanel', () => {
  it('opens on the grading tab with every rubric criterion and a score', () => {
    const html = renderToStaticMarkup(<JudgePanel open onClose={() => {}} />)
    expect(html).toContain('LLM Judge Visualizer')
    for (const c of ['Correct', 'Cites a source', 'Complete', 'Concise']) expect(html).toContain(`aria-label="Criterion: ${c}"`)
    expect(html).toContain('passed weight ÷ total = 7 ÷ 7 = 1.00')
    expect(html).toContain('aria-label="Answer: Confident guess"')
    expect(html).toContain('aria-label="Scale: Pass / Fail"')
  })

  it('renders nothing when closed', () => {
    expect(renderToStaticMarkup(<JudgePanel open={false} onClose={() => {}} />)).toBe('')
  })
})
