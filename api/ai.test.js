/* global process */
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import handler from './ai.js'
import { __resetRateLimit } from './_rateLimit.js'

// All test reqs share the same (headerless) IP bucket; reset between cases so
// the per-IP limiter doesn't accumulate into a 429 across the suite.
beforeEach(() => __resetRateLimit())

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
    const res = await handler(req({ task: 'import', text: 'a'.repeat(5000) }))
    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  test('rejects text beyond the import cap (8000)', async () => {
    const res = await handler(req({ task: 'import', text: 'a'.repeat(8001) }))
    expect(res.status).toBe(413)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('requests JSON mode, a larger token budget, and the 70B model', async () => {
    await handler(req({ task: 'import', text: 'a'.repeat(500) }))
    const body = sentBody()
    expect(body.response_format).toEqual({ type: 'json_object' })
    expect(body.max_tokens).toBeGreaterThanOrEqual(1500)
    expect(body.model).toBe('llama-3.3-70b-versatile')
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

describe('api/ai tailor + retarget tasks', () => {
  test('tailor is recognized and requests JSON mode on the 8B model', async () => {
    await handler(req({ task: 'tailor', text: 'POSTING: cashier\n\nSECTION: <p>I sold things</p>' }))
    const body = sentBody()
    expect(body.response_format).toEqual({ type: 'json_object' })
    expect(body.model).toBe('llama-3.1-8b-instant')
  })

  test('retarget is recognized, no JSON mode (returns HTML)', async () => {
    await handler(req({ task: 'retarget', text: 'POSTING: cashier\n\nSECTION: <p>x</p>' }))
    expect(sentBody().response_format).toBeUndefined()
  })

  test('both accept posting+section text up to 6000 chars', async () => {
    const res = await handler(req({ task: 'tailor', text: 'a'.repeat(6000) }))
    expect(res.status).toBe(200)
    const over = await handler(req({ task: 'tailor', text: 'a'.repeat(6001) }))
    expect(over.status).toBe(413)
  })
})

describe('api/ai format task (paragraph → bullet points)', () => {
  test('is a recognized task', async () => {
    const res = await handler(req({ task: 'format', text: '<p>I did a lot of things at my job.</p>' }))
    expect(res.status).toBe(200)
  })

  test('does not request JSON mode and runs on the fast 8B model', async () => {
    await handler(req({ task: 'format', text: '<p>I did things.</p>' }))
    const body = sentBody()
    expect(body.response_format).toBeUndefined()
    expect(body.model).toBe('llama-3.1-8b-instant')
  })

  test('returns the reformatted HTML as { result }', async () => {
    fetchMock.mockResolvedValue(groqOk('<ul><li>Did things.</li></ul>'))
    const res = await handler(req({ task: 'format', text: '<p>I did things.</p>' }))
    const data = await res.json()
    expect(data.result).toContain('<li>')
  })

  test('accepts a full section up to 6000 chars, rejects beyond', async () => {
    const ok = await handler(req({ task: 'format', text: 'a'.repeat(6000) }))
    expect(ok.status).toBe(200)
    const over = await handler(req({ task: 'format', text: 'a'.repeat(6001) }))
    expect(over.status).toBe(413)
  })

  test('appends the per-type layout hint for the section type', async () => {
    await handler(req({ task: 'format', sectionType: 'education', text: '<p>Harvard 2024</p>' }))
    const sys = sentBody().messages[0].content
    expect(sys).toContain('EDUCATION')
  })

  test('routes each section type to its own hint', async () => {
    await handler(req({ task: 'format', sectionType: 'contact', text: '<p>x</p>' }))
    expect(sentBody().messages[0].content).toContain('CONTACT')
  })

  test('falls back to the default hint for an unknown/absent section type', async () => {
    await handler(req({ task: 'format', text: '<p>x</p>' }))
    const sys = sentBody().messages[0].content
    expect(sys).toContain('résumé conventions')
    expect(sys).not.toContain('EDUCATION')
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

  test('editing tasks route to the fast 8B model', async () => {
    await handler(req({ task: 'improve', text: 'hello' }))
    expect(sentBody().model).toBe('llama-3.1-8b-instant')
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
