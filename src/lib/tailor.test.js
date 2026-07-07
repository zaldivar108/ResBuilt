import { describe, test, expect } from 'vitest'
import { parseTailorResult } from './tailor.js'

describe('parseTailorResult', () => {
  test('normalizes a well-formed analysis', () => {
    const r = parseTailorResult({
      matched: ['customer service', 'cash handling'],
      missing: ['POS systems', 'inventory'],
      suggestions: ['Trained new staff on register procedures'],
    })
    expect(r.ok).toBe(true)
    expect(r.matched).toEqual(['customer service', 'cash handling'])
    expect(r.missing).toContain('POS systems')
    expect(r.suggestions).toHaveLength(1)
  })

  test('parses a JSON string and a fenced string', () => {
    const obj = { matched: ['a'], missing: [], suggestions: [] }
    expect(parseTailorResult(JSON.stringify(obj)).ok).toBe(true)
    expect(parseTailorResult('```json\n' + JSON.stringify(obj) + '\n```').ok).toBe(true)
  })

  test('drops non-string / blank entries and trims', () => {
    const r = parseTailorResult({ matched: ['  ok  ', '', 3, null], missing: [], suggestions: [] })
    expect(r.matched).toEqual(['ok'])
  })

  test('defaults missing arrays to empty', () => {
    const r = parseTailorResult({ matched: ['a'] })
    expect(r.ok).toBe(true)
    expect(r.missing).toEqual([])
    expect(r.suggestions).toEqual([])
  })

  test('caps suggestions to at most 3', () => {
    const r = parseTailorResult({ matched: [], missing: [], suggestions: ['a', 'b', 'c', 'd', 'e'] })
    expect(r.suggestions).toHaveLength(3)
  })

  test.each([null, undefined, 42, 'not json {{{', { foo: 1 }, {}])('rejects unusable input %s', raw => {
    // An object with no matched/missing/suggestions is unusable.
    const r = parseTailorResult(raw)
    expect(r.ok).toBe(false)
    expect(typeof r.error).toBe('string')
  })
})
