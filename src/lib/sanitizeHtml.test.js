import { describe, test, expect } from 'vitest'
import { sanitizeHtml } from './sanitizeHtml.js'

describe('sanitizeHtml', () => {
  test('keeps the résumé-safe formatting tags', () => {
    const html = '<p>Hi <strong>there</strong> <em>friend</em></p><ul><li>one</li></ul>'
    expect(sanitizeHtml(html)).toBe(html)
  })

  test('strips <script> tags entirely', () => {
    const out = sanitizeHtml('<p>ok</p><script>alert(1)</script>')
    expect(out).toContain('<p>ok</p>')
    expect(out).not.toContain('script')
  })

  test('removes inline event handlers', () => {
    const out = sanitizeHtml('<p onclick="steal()">hi</p>')
    expect(out).toContain('hi')
    expect(out).not.toMatch(/onclick/i)
  })

  test('strips img with an onerror payload', () => {
    const out = sanitizeHtml('<img src=x onerror="alert(1)">')
    expect(out).not.toMatch(/onerror/i)
  })

  test('neutralizes javascript: URLs on links', () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">x</a>')
    expect(out).not.toMatch(/javascript:/i)
  })

  test('keeps safe http links', () => {
    const out = sanitizeHtml('<a href="https://example.com">site</a>')
    expect(out).toContain('href="https://example.com"')
  })

  test('handles empty / non-string input', () => {
    expect(sanitizeHtml('')).toBe('')
    expect(sanitizeHtml(null)).toBe('')
    expect(sanitizeHtml(undefined)).toBe('')
  })
})
