import { describe, test, expect } from 'vitest'
import { scrubPii } from './scrubPii.js'

describe('scrubPii', () => {
  test('redacts email addresses', () => {
    expect(scrubPii('Reach me at jane.doe@example.com today')).toBe('Reach me at [email] today')
  })

  test('redacts phone numbers in common formats', () => {
    expect(scrubPii('Call (555) 123-4567')).toBe('Call [phone]')
    expect(scrubPii('cell 555-123-4567')).toBe('cell [phone]')
    expect(scrubPii('+1 555.123.4567')).toBe('[phone]')
  })

  test('redacts URLs', () => {
    expect(scrubPii('Portfolio: https://jane.dev/work')).toBe('Portfolio: [link]')
  })

  test('leaves ordinary résumé text untouched', () => {
    const text = 'Led a team of 5 volunteers and raised $2,000 for the food bank.'
    expect(scrubPii(text)).toBe(text)
  })

  test('handles empty / non-string input', () => {
    expect(scrubPii('')).toBe('')
    expect(scrubPii(null)).toBe('')
    expect(scrubPii(undefined)).toBe('')
  })
})
