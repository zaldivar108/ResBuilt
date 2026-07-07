/* global process */
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import handler from './onet.js'

// Build a GET Request the Edge handler understands.
function req(query, method = 'GET') {
  return { method, url: `https://app.test/api/onet?${query}` }
}

function onetOk(body) {
  return { ok: true, status: 200, json: async () => body }
}

let fetchMock

beforeEach(() => {
  process.env.ONET_API_KEY = 'test-onet-key'
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.ONET_API_KEY
})

describe('api/onet auth + method guards', () => {
  test('rejects non-GET methods', async () => {
    const res = await handler(req('action=search&keyword=x', 'POST'))
    expect(res.status).toBe(405)
  })

  test('returns 503 when the key is not configured', async () => {
    delete process.env.ONET_API_KEY
    const res = await handler(req('action=search&keyword=x'))
    expect(res.status).toBe(503)
  })

  test('sends the key in the X-API-Key header, never the query string', async () => {
    fetchMock.mockResolvedValue(onetOk({ career: [] }))
    await handler(req('action=search&keyword=cashier'))
    const [calledUrl, opts] = fetchMock.mock.calls[0]
    expect(opts.headers['X-API-Key']).toBe('test-onet-key')
    expect(opts.headers.Accept).toBe('application/json')
    expect(calledUrl).not.toContain('test-onet-key')
    expect(calledUrl).toContain('api-v2.onetcenter.org/mnm/search')
  })
})

describe('api/onet search action', () => {
  test('returns normalized {code,title} results', async () => {
    fetchMock.mockResolvedValue(
      onetOk({ career: [{ code: '41-2011.00', title: 'Cashiers', tags: {} }] })
    )
    const res = await handler(req('action=search&keyword=cashier'))
    const data = await res.json()
    expect(data.results).toEqual([{ code: '41-2011.00', title: 'Cashiers' }])
  })

  test('short-circuits an empty keyword without calling O*NET', async () => {
    const res = await handler(req('action=search&keyword='))
    const data = await res.json()
    expect(data.results).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('api/onet occupation action', () => {
  test('fetches the career detail and returns a full record in one call', async () => {
    fetchMock.mockResolvedValueOnce(
      onetOk({
        code: '41-2011.00',
        title: 'Cashiers',
        on_the_job: ['Receive payment by cash.'],
        also_called: [{ title: 'Checker' }],
      })
    )
    const res = await handler(req('action=occupation&code=41-2011.00&title=Cashiers'))
    const data = await res.json()
    expect(data.occupation).toMatchObject({
      code: '41-2011.00',
      title: 'Cashiers',
      tasks: ['Receive payment by cash.'],
      keywords: ['Checker'],
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toContain('/mnm/careers/41-2011.00/')
  })

  test('requires a code', async () => {
    const res = await handler(req('action=occupation&title=Cashiers'))
    expect(res.status).toBe(400)
  })

  test('maps an upstream 404 to a not-found error', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404, json: async () => ({}) })
    const res = await handler(req('action=occupation&code=99-9999.99&title=x'))
    expect(res.status).toBe(404)
  })

  test('maps other upstream failures to 502', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) })
    const res = await handler(req('action=occupation&code=41-2011.00&title=x'))
    expect(res.status).toBe(502)
  })
})

describe('api/onet unknown action', () => {
  test('rejects an unrecognized action', async () => {
    const res = await handler(req('action=bogus'))
    expect(res.status).toBe(400)
  })
})
