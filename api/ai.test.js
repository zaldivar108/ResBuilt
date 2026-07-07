/* global process */
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import handler from './ai.js'

// Build a minimal Request-like object the Edge handler understands.
function req(body, method = 'POST') {
  return { method, json: async () => body }
}

function groqOk(content) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content } }] }),
  }
}

let fetchMock

beforeEach(() => {
  process.env.GROQ_API_KEY = 'test-key'
  fetchMock = vi.fn().mockResolvedValue(groqOk('{"sections":[]}'))
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.GROQ_API_KEY
})

function sentBody() {
  return JSON.parse(fetchMock.mock.calls[0][1].body)
}

describe('api/ai import task', () => {
  test('is a recognized task (not "Unknown task")', async () => {
    const res = await handler(req({ task: 'import', text: 'x'.repeat(200) }))
    expect(res.status).toBe(200)
  })

  test('accepts résumé text longer than the 2000-char per-section cap', async () => {
    const res = await handler(req({ task: 'import', text: 'a'.repeat(9000) }))
    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  test('rejects text beyond the import cap (15000)', async () => {
    const res = await handler(req({ task: 'import', text: 'a'.repeat(15001) }))
    expect(res.status).toBe(413)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('requests JSON mode and a larger token budget from Groq', async () => {
    await handler(req({ task: 'import', text: 'a'.repeat(500) }))
    const body = sentBody()
    expect(body.response_format).toEqual({ type: 'json_object' })
    expect(body.max_tokens).toBeGreaterThanOrEqual(1500)
  })

  test('returns the raw JSON string as { result }', async () => {
    fetchMock.mockResolvedValue(groqOk('{"sections":[{"title":"Contact","type":"contact","content":"<p>Jane</p>"}]}'))
    const res = await handler(req({ task: 'import', text: 'a'.repeat(200) }))
    const data = await res.json()
    expect(typeof data.result).toBe('string')
    expect(data.result).toContain('sections')
  })
})

describe('api/ai polish task (O*NET-grounded rewrite)', () => {
  test('is a recognized task', async () => {
    const res = await handler(req({ task: 'polish', text: 'Receive payment by cash.' }))
    expect(res.status).toBe(200)
  })

  test('does not request JSON mode and returns { result }', async () => {
    fetchMock.mockResolvedValue(groqOk('<ul><li>Handled cash and card payments accurately.</li></ul>'))
    const res = await handler(req({ task: 'polish', text: 'Receive payment by cash.' }))
    expect(sentBody().response_format).toBeUndefined()
    const data = await res.json()
    expect(data.result).toContain('<li>')
  })
})

describe('api/ai regression — existing per-section tasks', () => {
  test('improve still rejects text over 2000 chars', async () => {
    const res = await handler(req({ task: 'improve', text: 'a'.repeat(2001) }))
    expect(res.status).toBe(413)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('improve does not request JSON mode', async () => {
    await handler(req({ task: 'improve', text: 'hello' }))
    expect(sentBody().response_format).toBeUndefined()
  })

  test('unknown task is still rejected', async () => {
    const res = await handler(req({ task: 'nope', text: 'hi' }))
    expect(res.status).toBe(400)
  })

  test('missing API key returns 503', async () => {
    delete process.env.GROQ_API_KEY
    const res = await handler(req({ task: 'improve', text: 'hi' }))
    expect(res.status).toBe(503)
  })
})
