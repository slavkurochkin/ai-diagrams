import { describe, expect, it } from 'vitest'
import { align, computeWer, formatRate, normalize, numberToWords, parseEntities } from './wer'

describe('normalize', () => {
  it('standard: lowercase, no punctuation, numbers and times as words, no fillers', () => {
    expect(normalize('Um, book me for 3:30 on Tuesday!', 'standard')).toEqual(['book', 'me', 'for', 'three', 'thirty', 'on', 'tuesday'])
    expect(normalize('at 3:05 or 3:00', 'standard')).toEqual(['at', 'three', 'oh', 'five', 'or', 'three'])
    expect(normalize("it's 42", 'standard')).toEqual(["it's", 'forty', 'two'])
  })

  it('basic keeps digits and fillers; none keeps everything', () => {
    expect(normalize('Um, 3:30 Tuesday!', 'basic')).toEqual(['um', '3', '30', 'tuesday'])
    expect(normalize('Um, 3:30 Tuesday!', 'none')).toEqual(['Um,', '3:30', 'Tuesday!'])
  })

  it('reads numbers as words', () => {
    expect(numberToWords(0)).toBe('zero')
    expect(numberToWords(13)).toBe('thirteen')
    expect(numberToWords(70)).toBe('seventy')
    expect(numberToWords(305)).toBe('three hundred five')
    expect(numberToWords(2026)).toBe('two thousand twenty six')
  })
})

describe('align', () => {
  it('labels every edit', () => {
    const ops = align(['a', 'b', 'c', 'd'], ['a', 'x', 'c', 'e', 'd'])
    expect(ops.map((o) => o.type)).toEqual(['match', 'sub', 'match', 'ins', 'match'])
  })

  it('pairs similar words when edit counts tie', () => {
    const ops = align(['three', 'thirty', 'on'], ['three', 'thirteen'])
    expect(ops).toEqual([
      { type: 'match', ref: 'three', hyp: 'three', refIndex: 0 },
      { type: 'sub', ref: 'thirty', hyp: 'thirteen', refIndex: 1 },
      { type: 'del', ref: 'on', refIndex: 2 },
    ])
    // Same on the other side of an insertion.
    expect(align(['book', 'now'], ['book', 'it', 'now']).map((o) => o.type)).toEqual(['match', 'ins', 'match'])
  })

  it('never trades an extra edit for a nicer pairing', () => {
    const ops = align(['a', 'b', 'c'], ['x', 'y', 'z'])
    expect(ops.map((o) => o.type)).toEqual(['sub', 'sub', 'sub'])
  })

  it('handles empty sides', () => {
    expect(align([], ['a']).map((o) => o.type)).toEqual(['ins'])
    expect(align(['a'], []).map((o) => o.type)).toEqual(['del'])
  })
})

describe('computeWer', () => {
  it('scores the explainer example: one substitution, one deletion in seven words', () => {
    const r = computeWer('Book me for three thirty on Tuesday', 'book me for three thirteen tuesday', {
      entities: ['three thirty', 'tuesday'],
    })
    expect([r.substitutions, r.deletions, r.insertions, r.refLength]).toEqual([1, 1, 0, 7])
    expect(formatRate(r.wer)).toBe('28.6%')
    expect(r.entities).toEqual([
      { phrase: 'three thirty', found: true, correct: false },
      { phrase: 'tuesday', found: true, correct: true },
    ])
    expect(r.entityErrorRate).toBe(0.5)
  })

  it('normalisation decides whether formatting counts as an error', () => {
    expect(computeWer('three thirty', '3:30').wer).toBe(0)
    expect(computeWer('three thirty', '3:30', { normalization: 'none' }).wer).toBe(1)
  })

  it('can exceed 100% when the transcript adds words', () => {
    expect(computeWer('yes', 'yes yes yes').wer).toBe(2)
  })

  it('is undefined for an empty reference, and CER counts characters', () => {
    expect(computeWer('', 'anything').wer).toBeNull()
    expect(formatRate(null)).toBe('—')
    expect(computeWer('cat', 'cut').cer).toBeCloseTo(1 / 3)
  })

  it('ignores entities missing from the reference', () => {
    const r = computeWer('hello there', 'hello there', { entities: parseEntities('there, nowhere ,') })
    expect(r.entities.map((e) => e.found)).toEqual([true, false])
    expect(r.entityErrorRate).toBe(0)
  })
})
