import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import WERPanel from './WERPanel'
import WerAlignment from '../wer/WerAlignment'
import { computeWer } from '../../lib/wer'

const example = {
  reference: 'Book me for three thirty on Tuesday',
  transcript: 'book me for three thirteen tuesday',
  entities: 'three thirty, tuesday',
  normalization: 'standard' as const,
}

describe('WERPanel', () => {
  it('renders the alignment and metrics for its example', () => {
    const html = renderToStaticMarkup(<WERPanel open onClose={() => {}} initial={example} onSave={() => {}} />)
    expect(html).toContain('Word Error Rate Visualizer')
    expect(html).toContain('28.6%') // WER
    expect(html).toContain('50.0%') // entity error rate
    expect(html).toContain('(1S + 1D + 0I) / 7')
    expect(html).toContain('Save to node')
  })

  it('hides "Save to node" when not editing a node, and renders nothing when closed', () => {
    expect(renderToStaticMarkup(<WERPanel open onClose={() => {}} initial={example} />)).not.toContain('Save to node')
    expect(renderToStaticMarkup(<WERPanel open={false} onClose={() => {}} initial={example} />)).toBe('')
  })
})

describe('WerAlignment', () => {
  it('shows a substitution with both words and a deletion struck through', () => {
    const { ops } = computeWer(example.reference, example.transcript)
    const html = renderToStaticMarkup(<WerAlignment ops={ops} />)
    expect(html).toContain('substitution: &quot;thirty&quot; heard as &quot;thirteen&quot;')
    expect(html).toContain('deletion: &quot;on&quot; was missed')
  })
})
