import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import LatencyPanel from './LatencyPanel'
import { DEFAULT_TEXT_TIMINGS, DEFAULT_VOICE_TIMINGS } from '../../lib/latency'

describe('LatencyPanel', () => {
  it('voice: renders the waterfall, the headline, and the streaming what-if', () => {
    const html = renderToStaticMarkup(
      <LatencyPanel open onClose={() => {}} kind="voice" initial={DEFAULT_VOICE_TIMINGS} stageBudgets={{ llmTtft: 300 }} onSave={() => {}} />,
    )
    expect(html).toContain('Voice Latency Visualizer')
    expect(html).toContain('Time to first audio')
    expect(html).toContain('1.14 s')
    expect(html).toContain('LLM time to first token')
    expect(html).toContain('Streaming TTS is saving')
    expect(html).toContain('600 ms') // the what-if delta
    expect(html).toContain('(budget 300 ms)') // the over-budget stage is flagged
    expect(html).toContain('Save to node')
  })

  it('text: reports time to first token and the full wait without streaming', () => {
    const html = renderToStaticMarkup(<LatencyPanel open onClose={() => {}} kind="text" initial={DEFAULT_TEXT_TIMINGS} />)
    expect(html).toContain('Response Latency Visualizer')
    expect(html).toContain('Time to first token')
    expect(html).toContain('users start reading after 450 ms')
    expect(html).not.toContain('Save to node')
  })

  it('renders nothing when closed', () => {
    expect(renderToStaticMarkup(<LatencyPanel open={false} onClose={() => {}} kind="voice" initial={DEFAULT_VOICE_TIMINGS} />)).toBe('')
  })
})
