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
  // Shape satisfies any JSON task's jsonRequire (import→sections, tailor→matched).
  fetchMock = vi.fn().mockResolvedValue(groqOk('{"sections":[],"matched":[],"missing":[],"suggestions":[]}'))
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.GROQ_API_KEY
  delete process.env.OPENCODE_API_KEY
})

function sentBody() {
  return JSON.parse(fetchMock.mock.calls[0][1].body)
}

// Route the fetch mock by URL fragment so provider order/fallback is testable.
function mockByUrl(map) {
  fetchMock.mockImplementation(url => {
    for (const [frag, resp] of Object.entries(map)) {
      if (String(url).includes(frag)) return Promise.resolve(resp)
    }
    return Promise.resolve({ ok: false, status: 502, json: async () => ({}) })
  })
}
const OC = 'opencode.ai'
const GROQ = 'api.groq.com'
const callUrl = i => String(fetchMock.mock.calls[i][0])
const callBody = i => JSON.parse(fetchMock.mock.calls[i][1].body)

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

describe('api/ai review task (whole-résumé review)', () => {
  test('is a recognized task', async () => {
    const res = await handler(req({ task: 'review', text: 'SECTION summary (id: s1, title: "Summary"):\nHi' }))
    expect(res.status).toBe(200)
  })

  test('requests JSON mode, a larger token budget, and the 70B model', async () => {
    await handler(req({ task: 'review', text: 'a'.repeat(500) }))
    const body = sentBody()
    expect(body.response_format).toEqual({ type: 'json_object' })
    expect(body.max_tokens).toBeGreaterThanOrEqual(1600)
    expect(body.model).toBe('llama-3.3-70b-versatile')
  })

  test('accepts up to 8000 chars, rejects beyond', async () => {
    const ok = await handler(req({ task: 'review', text: 'a'.repeat(8000) }))
    expect(ok.status).toBe(200)
    const over = await handler(req({ task: 'review', text: 'a'.repeat(8001) }))
    expect(over.status).toBe(413)
  })

  test('returns the raw JSON string as { result }', async () => {
    fetchMock.mockResolvedValue(groqOk('{"sections":{"s1":{"strengths":["Clear"],"issues":[]}}}'))
    const res = await handler(req({ task: 'review', text: 'a'.repeat(200) }))
    const data = await res.json()
    expect(data.result).toContain('strengths')
  })

  test('falls back to Groq when OpenCode returns valid JSON of the wrong shape', async () => {
    process.env.OPENCODE_API_KEY = 'oc-key'
    mockByUrl({
      [OC]: groqOk('{"html":"<p>oops</p>"}'),
      [GROQ]: groqOk('{"sections":{"s1":{"strengths":[],"issues":["Too generic"]}}}'),
    })
    const res = await handler(req({ task: 'review', text: 'a'.repeat(200) }))
    expect(res.status).toBe(200)
    expect(callUrl(1)).toContain(GROQ)
    expect((await res.json()).result).toContain('Too generic')
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

  test('does not stream format, so an empty primary can fall back', async () => {
    process.env.OPENCODE_API_KEY = 'oc-key'
    mockByUrl({
      [OC]: groqOk(''),
      [GROQ]: groqOk('<ul><li>Formatted from fallback.</li></ul>'),
    })

    const res = await handler(req({ task: 'format', text: 'a'.repeat(5500), stream: true }))
    const data = await res.json()

    expect(res.headers.get('Content-Type')).toContain('application/json')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(callBody(0).stream).toBeUndefined()
    expect(callBody(1).stream).toBeUndefined()
    expect(data.result).toContain('Formatted from fallback')
  })
})

describe('api/ai improve task — fragment mode (ADR 0006)', () => {
  test('appends the fragment hint when fragment: true', async () => {
    await handler(req({ task: 'improve', text: 'helped customers', fragment: true }))
    const sys = sentBody().messages[0].content
    expect(sys).toContain('ONLY a short fragment of plain text')
  })

  test('does not append the fragment hint by default (whole-section improve unchanged)', async () => {
    await handler(req({ task: 'improve', text: '<p>Helped customers.</p>' }))
    const sys = sentBody().messages[0].content
    expect(sys).not.toContain('short fragment of plain text')
  })

  test('fragment mode uses the same model, budget, and no JSON mode as normal improve', async () => {
    await handler(req({ task: 'improve', text: 'helped customers', fragment: true }))
    const body = sentBody()
    expect(body.model).toBe('llama-3.1-8b-instant')
    expect(body.response_format).toBeUndefined()
    expect(body.max_tokens).toBe(600 + 2000)
  })

  test('fragment mode still enforces the same 3500-char cap', async () => {
    const res = await handler(req({ task: 'improve', text: 'a'.repeat(3501), fragment: true }))
    expect(res.status).toBe(413)
  })
})

describe('api/ai regression — existing per-section tasks', () => {
  test('improve accepts up to 3500 chars and rejects text over 3500 chars', async () => {
    const ok = await handler(req({ task: 'improve', text: 'a'.repeat(3500) }))
    expect(ok.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledOnce()

    fetchMock.mockClear()
    const res = await handler(req({ task: 'improve', text: 'a'.repeat(3501) }))
    expect(res.status).toBe(413)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('does not stream improve requests, so an empty primary can fall back', async () => {
    process.env.OPENCODE_API_KEY = 'oc-key'
    mockByUrl({
      [OC]: groqOk(''),
      [GROQ]: groqOk('<p>Improved by fallback.</p>'),
    })

    const res = await handler(req({ task: 'improve', text: '<p>Helped customers.</p>', stream: true }))
    const data = await res.json()

    expect(res.headers.get('Content-Type')).toContain('application/json')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(callBody(0).stream).toBeUndefined()
    expect(callBody(1).stream).toBeUndefined()
    expect(data.result).toContain('Improved by fallback')
  })

  test('still streams ideas requests', async () => {
    await handler(req({ task: 'ideas', text: '<p>Helped customers.</p>', stream: true }))
    expect(sentBody().stream).toBe(true)
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

  test('with no provider key at all, returns 503', async () => {
    delete process.env.GROQ_API_KEY // OPENCODE also unset
    const res = await handler(req({ task: 'improve', text: 'hi' }))
    expect(res.status).toBe(503)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('api/ai provider routing — OpenCode primary → Groq fallback', () => {
  beforeEach(() => {
    process.env.OPENCODE_API_KEY = 'oc-key' // GROQ_API_KEY already set in outer beforeEach
  })

  test('uses OpenCode first when its key is present', async () => {
    mockByUrl({ [OC]: groqOk('<p>improved</p>') })
    const res = await handler(req({ task: 'improve', text: 'hi' }))
    expect(res.status).toBe(200)
    expect(callUrl(0)).toContain(OC)
    expect(callBody(0).model).toBe('deepseek-v4-flash-free')
    expect(fetchMock).toHaveBeenCalledOnce() // no fallback needed
    expect((await res.json()).result).toContain('improved')
  })

  test('routes the large-tier import task to the OpenCode ultra model', async () => {
    mockByUrl({ [OC]: groqOk('{"sections":[]}') })
    await handler(req({ task: 'import', text: 'a'.repeat(300) }))
    expect(callBody(0).model).toBe('nemotron-3-ultra-free')
  })

  test('falls back to Groq when OpenCode returns a 5xx', async () => {
    mockByUrl({ [OC]: { ok: false, status: 500, json: async () => ({}) }, [GROQ]: groqOk('<p>from groq</p>') })
    const res = await handler(req({ task: 'improve', text: 'hi' }))
    expect(res.status).toBe(200)
    expect(callUrl(0)).toContain(OC)
    expect(callUrl(1)).toContain(GROQ)
    expect(callBody(1).model).toBe('llama-3.1-8b-instant')
    expect((await res.json()).result).toContain('from groq')
  })

  test('falls back to Groq on an OpenCode network error', async () => {
    fetchMock.mockImplementation(url =>
      String(url).includes(OC) ? Promise.reject(new Error('offline')) : Promise.resolve(groqOk('<p>g</p>'))
    )
    const res = await handler(req({ task: 'improve', text: 'hi' }))
    expect(res.status).toBe(200)
    expect((await res.json()).result).toContain('g')
  })

  test('falls back when a JSON task gets unparseable JSON from OpenCode', async () => {
    mockByUrl({ [OC]: groqOk('sorry, here is your resume!'), [GROQ]: groqOk('{"sections":[]}') })
    const res = await handler(req({ task: 'import', text: 'a'.repeat(300) }))
    expect(res.status).toBe(200)
    expect(callUrl(1)).toContain(GROQ)
    expect((await res.json()).result).toBe('{"sections":[]}')
  })

  test('falls back when OpenCode returns valid JSON of the wrong shape', async () => {
    // nemotron JSON mode can invent its own key (e.g. {"html":...}) instead of
    // the {"sections":[...]} import needs — that must not win over Groq.
    mockByUrl({ [OC]: groqOk('{"html":"<p>oops</p>"}'), [GROQ]: groqOk('{"sections":[]}') })
    const res = await handler(req({ task: 'import', text: 'a'.repeat(300) }))
    expect(res.status).toBe(200)
    expect(callUrl(1)).toContain(GROQ)
    expect((await res.json()).result).toBe('{"sections":[]}')
  })

  test('keeps a valid JSON completion from OpenCode (no needless fallback)', async () => {
    mockByUrl({ [OC]: groqOk('{"sections":[{"type":"contact","title":"C","content":"<p>x</p>"}]}') })
    const res = await handler(req({ task: 'import', text: 'a'.repeat(300) }))
    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  test('no fallback available → surfaces the error (only OpenCode configured)', async () => {
    delete process.env.GROQ_API_KEY
    mockByUrl({ [OC]: { ok: false, status: 500, json: async () => ({}) } })
    const res = await handler(req({ task: 'improve', text: 'hi' }))
    expect(res.status).toBe(502)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  test('both providers 429 → returns 429', async () => {
    mockByUrl({ [OC]: { ok: false, status: 429, json: async () => ({}) }, [GROQ]: { ok: false, status: 429, json: async () => ({}) } })
    const res = await handler(req({ task: 'improve', text: 'hi' }))
    expect(res.status).toBe(429)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
