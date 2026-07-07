import { describe, test, expect } from 'vitest'
import { formatContactLocal, normalizePhone } from './contactFormat.js'

describe('normalizePhone', () => {
  test('formats a US 10-digit number', () => {
    expect(normalizePhone('5551234567')).toBe('(555) 123-4567')
    expect(normalizePhone('555.123.4567')).toBe('(555) 123-4567')
  })
  test('formats an 11-digit number with leading 1', () => {
    expect(normalizePhone('15551234567')).toBe('+1 (555) 123-4567')
  })
  test('leaves an unrecognized number unchanged (trimmed)', () => {
    expect(normalizePhone(' +44 20 7946 0958 ')).toBe('+44 20 7946 0958')
  })
})

describe('formatContactLocal', () => {
  test('orders name, email, phone, then links; normalizes the phone', () => {
    const html = '<p>Jane Doe</p><p>jane@example.com</p><p>555-123-4567</p><p>linkedin.com/in/jane</p>'
    expect(formatContactLocal(html)).toBe(
      '<p><strong>Jane Doe</strong></p><p>jane@example.com</p><p>(555) 123-4567</p><p>linkedin.com/in/jane</p>'
    )
  })

  test('splits crammed single-line contact fields', () => {
    const html = '<p>Jane Doe · jane@example.com · 555-123-4567</p>'
    expect(formatContactLocal(html)).toBe(
      '<p><strong>Jane Doe</strong></p><p>jane@example.com</p><p>(555) 123-4567</p>'
    )
  })

  test('preserves a location line as an extra <p>', () => {
    const html = '<p>Jane Doe</p><p>Austin, TX</p><p>jane@example.com</p>'
    expect(formatContactLocal(html)).toBe(
      '<p><strong>Jane Doe</strong></p><p>jane@example.com</p><p>Austin, TX</p>'
    )
  })

  test('strips injected tags so markup cannot execute', () => {
    const html = '<p>Jane <img src=x onerror=alert(1)></p><p>jane@example.com</p>'
    const out = formatContactLocal(html)
    expect(out).not.toContain('<img')
    expect(out).not.toContain('onerror')
  })

  test('escapes text-level angle brackets that survive tag-stripping', () => {
    const html = '<p>A &lt;b&gt; C</p><p>a@b.co</p>'
    const out = formatContactLocal(html)
    expect(out).toContain('&lt;b&gt;')
    expect(out).not.toContain('<b>')
  })

  test('returns the original when there is nothing to parse', () => {
    expect(formatContactLocal('')).toBe('')
  })
})
