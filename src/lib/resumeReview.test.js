import { describe, test, expect } from 'vitest'
import { buildReviewPrompt, parseReviewResult } from './resumeReview.js'

function section(overrides = {}) {
  return { id: 's1', title: 'Summary', type: 'summary', content: '<p>Hi</p>', ...overrides }
}

describe('buildReviewPrompt', () => {
  test('labels each visible section with its id, type, and title', () => {
    const { text, sectionTitles } = buildReviewPrompt([section()])
    expect(text).toContain('SECTION summary (id: s1, title: "Summary")')
    expect(text).toContain('Hi')
    expect(sectionTitles).toEqual({ s1: 'Summary' })
  })

  test('excludes hidden sections', () => {
    const { text, sectionTitles } = buildReviewPrompt([section({ hidden: true })])
    expect(text).toBe('')
    expect(sectionTitles).toEqual({})
  })

  test('scrubs PII (email/phone/link) from section content', () => {
    const { text } = buildReviewPrompt([
      section({ content: '<p>Reach me at teen@example.com or (555) 123-4567</p>' }),
    ])
    expect(text).not.toContain('teen@example.com')
    expect(text).not.toContain('555')
  })

  test('truncates a very long section instead of dropping it', () => {
    const long = 'x'.repeat(5000)
    const { text } = buildReviewPrompt([section({ content: `<p>${long}</p>` })])
    expect(text).toContain('SECTION summary')
    expect(text.length).toBeLessThan(long.length)
  })

  test('handles null/undefined/empty input without throwing', () => {
    expect(buildReviewPrompt(null)).toEqual({ text: '', sectionTitles: {} })
    expect(buildReviewPrompt(undefined)).toEqual({ text: '', sectionTitles: {} })
    expect(buildReviewPrompt([])).toEqual({ text: '', sectionTitles: {} })
  })
})

describe('parseReviewResult', () => {
  const titles = { s1: 'Summary', s2: 'Experience' }

  test('normalizes a well-formed response', () => {
    const r = parseReviewResult(
      { sections: { s1: { strengths: ['Clear goal'], issues: ['Too generic'] } } },
      titles
    )
    expect(r.ok).toBe(true)
    expect(r.bySection).toEqual([
      { sectionId: 's1', sectionTitle: 'Summary', strengths: ['Clear goal'], issues: ['Too generic'] },
    ])
  })

  test('parses a JSON string and a fenced string', () => {
    const obj = { sections: { s1: { strengths: ['a'], issues: [] } } }
    expect(parseReviewResult(JSON.stringify(obj), titles).ok).toBe(true)
    expect(parseReviewResult('```json\n' + JSON.stringify(obj) + '\n```', titles).ok).toBe(true)
  })

  test('drops entries for section ids the model invented', () => {
    const r = parseReviewResult(
      { sections: { unknown_id: { strengths: ['x'], issues: [] }, s1: { strengths: ['ok'], issues: [] } } },
      titles
    )
    expect(r.ok).toBe(true)
    expect(r.bySection).toHaveLength(1)
    expect(r.bySection[0].sectionId).toBe('s1')
  })

  test('drops a section entry with no strengths and no issues', () => {
    const r = parseReviewResult({ sections: { s1: { strengths: [], issues: [] } } }, titles)
    expect(r.ok).toBe(false)
  })

  test('filters non-string / blank list entries and trims', () => {
    const r = parseReviewResult(
      { sections: { s1: { strengths: ['  good  ', '', 3, null], issues: [] } } },
      titles
    )
    expect(r.bySection[0].strengths).toEqual(['good'])
  })

  test('rejects a missing or wrong-shape "sections" key', () => {
    expect(parseReviewResult({ foo: 'bar' }, titles).ok).toBe(false)
    expect(parseReviewResult({ sections: 'not an object' }, titles).ok).toBe(false)
    expect(parseReviewResult('not json at all', titles).ok).toBe(false)
    expect(parseReviewResult(null, titles).ok).toBe(false)
  })

  test('fails when every returned section id is unrecognized', () => {
    const r = parseReviewResult({ sections: { bogus: { strengths: ['x'], issues: [] } } }, titles)
    expect(r.ok).toBe(false)
  })
})
