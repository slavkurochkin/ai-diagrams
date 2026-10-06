import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import GenerationEvalPanel from './GenerationEvalPanel'

describe('GenerationEvalPanel', () => {
  it('opens on faithfulness: chunks, answers, and the claim-check steps', () => {
    const html = renderToStaticMarkup(<GenerationEvalPanel open onClose={() => {}} />)
    expect(html).toContain('Generation Metrics Visualizer')
    expect(html).toContain('aria-label="Answer: Makes things up"')
    expect(html).toContain('aria-label="Split into claims"')
    expect(html).toContain('aria-label="Check each claim"')
  })

  it('context tab: recall and precision with their arithmetic', () => {
    const html = renderToStaticMarkup(<GenerationEvalPanel open onClose={() => {}} initialTab="context" />)
    expect(html).toContain('recall = 3 ÷ 3 = ')
    expect(html).toContain('(1/1 + 2/2) ÷ 2 = ')
    expect(html).toContain('aria-label="Retrieval: Missing a chunk"')
  })

  it('diagnose tab: generator and retriever scores', () => {
    const html = renderToStaticMarkup(<GenerationEvalPanel open onClose={() => {}} initialTab="diagnose" />)
    expect(html).toContain('data-metric="faithfulness"')
    expect(html).toContain('aria-label="Case: Made things up"')
  })

  it('renders nothing when closed', () => {
    expect(renderToStaticMarkup(<GenerationEvalPanel open={false} onClose={() => {}} />)).toBe('')
  })
})
