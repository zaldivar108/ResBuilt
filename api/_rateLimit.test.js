import { describe, test, expect, vi, afterEach } from 'vitest'
import { checkRateLimit, clientIp } from './_rateLimit.js'

// Minimal Request stand-in: only headers.get is used by the limiter.
function reqWithIp(ip) {
  return { headers: { get: name => (name === 'x-forwarded-for' ? ip : null) } }
}

afterEach(() => vi.restoreAllMocks())

describe('clientIp', () => {
  test('takes the first x-forwarded-for entry', () => {
    expect(clientIp(reqWithIp('1.2.3.4, 5.6.7.8'))).toBe('1.2.3.4')
  })
  test('falls back to "unknown" with no proxy headers', () => {
    expect(clientIp({ headers: { get: () => null } })).toBe('unknown')
  })
})

describe('checkRateLimit', () => {
  test('allows up to the limit then blocks with a retryAfter', () => {
    const now = 1_000_000
    vi.spyOn(Date, 'now').mockReturnValue(now)
    const req = reqWithIp('10.0.0.1')
    expect(checkRateLimit(req, { limit: 2 }).ok).toBe(true)
    expect(checkRateLimit(req, { limit: 2 }).ok).toBe(true)
    const blocked = checkRateLimit(req, { limit: 2 })
    expect(blocked.ok).toBe(false)
    expect(blocked.retryAfter).toBeGreaterThan(0)
  })

  test('tracks IPs independently', () => {
    vi.spyOn(Date, 'now').mockReturnValue(2_000_000)
    expect(checkRateLimit(reqWithIp('10.0.0.2'), { limit: 1 }).ok).toBe(true)
    expect(checkRateLimit(reqWithIp('10.0.0.2'), { limit: 1 }).ok).toBe(false)
    expect(checkRateLimit(reqWithIp('10.0.0.3'), { limit: 1 }).ok).toBe(true) // different IP
  })

  test('allows again once the window has passed', () => {
    const spy = vi.spyOn(Date, 'now').mockReturnValue(3_000_000)
    const req = reqWithIp('10.0.0.4')
    expect(checkRateLimit(req, { limit: 1, windowMs: 1000 }).ok).toBe(true)
    expect(checkRateLimit(req, { limit: 1, windowMs: 1000 }).ok).toBe(false)
    spy.mockReturnValue(3_000_000 + 1001) // window elapsed
    expect(checkRateLimit(req, { limit: 1, windowMs: 1000 }).ok).toBe(true)
  })
})
