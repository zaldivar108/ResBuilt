import { describe, test, expect } from 'vitest'
import { extractDelta, splitSse } from './streamAi.js'

describe('extractDelta', () => {
  test('pulls the content token from a data line', () => {
    const line = 'data: {"choices":[{"delta":{"content":"Hello"}}]}'
    expect(extractDelta(line)).toEqual({ content: 'Hello' })
  })

  test('recognizes the [DONE] sentinel', () => {
    expect(extractDelta('data: [DONE]')).toEqual({ done: true })
  })

  test('returns empty content for a delta with no content (e.g. role frame)', () => {
    expect(extractDelta('data: {"choices":[{"delta":{"role":"assistant"}}]}')).toEqual({ content: '' })
  })

  test('tolerates malformed JSON without throwing', () => {
    expect(extractDelta('data: {broken')).toEqual({ content: '' })
  })
})

describe('splitSse', () => {
  test('splits complete events and keeps the trailing partial as rest', () => {
    const { events, rest } = splitSse('data: a\n\ndata: b\n\ndata: par')
    expect(events).toEqual(['data: a', 'data: b'])
    expect(rest).toBe('data: par')
  })

  test('returns no events when nothing is complete yet', () => {
    const { events, rest } = splitSse('data: incomplete')
    expect(events).toEqual([])
    expect(rest).toBe('data: incomplete')
  })
})
