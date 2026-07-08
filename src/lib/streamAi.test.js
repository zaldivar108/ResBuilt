import { describe, test, expect, afterEach, vi } from 'vitest'
import { extractDelta, splitSse, streamAiTask } from './streamAi.js'

afterEach(() => {
  vi.unstubAllGlobals()
})

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

describe('streamAiTask', () => {
  test('throws a friendly error when the server returns an empty result', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      body: null,
      json: async () => ({ result: '' }),
    }))

    await expect(streamAiTask({ task: 'format', text: '<p>x</p>' }, () => {}))
      .rejects.toThrow(/didn.t return/i)
  })
})
