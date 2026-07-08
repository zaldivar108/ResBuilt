import { describe, test, expect } from 'vitest'
import { buildImproveAllPrompt, parseImproveAllResult } from './resumeImprove.js'

function section(overrides = {}) {
  return { id: 's1', title: 'Summary', type: 'summary', content: '<p>Hi</p>', ...overrides }
}

describe('buildImproveAllPrompt', () => {
  test('labels each visible section with its id, type, and title, HTML intact', () => {
    const { text, sectionTitles } = buildImproveAllPrompt([section()])
    expect(text).toContain('SECTION summary (id: s1, title: "Summary")')
    expect(text).toContain('<p>Hi</p>')
    expect(sectionTitles).toEqual({ s1: 'Summary' })
  })

  test('excludes hidden sections', () => {
    const { text, sectionTitles } = buildImproveAllPrompt([section({ hidden: true })])
    expect(text).toBe('')
    expect(sectionTitles).toEqual({})
  })

  test('excludes the contact section (never sent — concentrated PII)', () => {
    const { text, sectionTitles } = buildImproveAllPrompt([
      section({ id: 'c1', type: 'contact', title: 'Contact', content: '<p>Jane Doe</p><p>jane@example.com</p>' }),
      section(),
    ])
    expect(text).not.toContain('jane@example.com')
    expect(sectionTitles).toEqual({ s1: 'Summary' })
  })

  test('does NOT scrub PII — improve rewrites real text verbatim, same as single-section improve', () => {
    const { text } = buildImproveAllPrompt([
      section({ content: '<p>Reach me at teen@example.com or (555) 123-4567</p>' }),
    ])
    expect(text).toContain('teen@example.com')
    expect(text).toContain('555')
  })

  test('truncates a very long section instead of dropping it', () => {
    const long = 'x'.repeat(5000)
    const { text } = buildImproveAllPrompt([section({ content: `<p>${long}</p>` })])
    expect(text).toContain('SECTION summary')
    expect(text.length).toBeLessThan(long.length)
  })

  test('handles null/undefined/empty input without throwing', () => {
    expect(buildImproveAllPrompt(null)).toEqual({ text: '', sectionTitles: {} })
    expect(buildImproveAllPrompt(undefined)).toEqual({ text: '', sectionTitles: {} })
    expect(buildImproveAllPrompt([])).toEqual({ text: '', sectionTitles: {} })
  })
})

describe('parseImproveAllResult', () => {
  const titles = { s1: 'Summary', s2: 'Experience' }

  test('normalizes a well-formed response', () => {
    const r = parseImproveAllResult({ sections: { s1: '<p>Better summary.</p>' } }, titles)
    expect(r.ok).toBe(true)
    expect(r.bySection).toEqual([
      { sectionId: 's1', sectionTitle: 'Summary', html: '<p>Better summary.</p>' },
    ])
  })

  test('parses a JSON string and a fenced string', () => {
    const obj = { sections: { s1: '<p>x</p>' } }
    expect(parseImproveAllResult(JSON.stringify(obj), titles).ok).toBe(true)
    expect(parseImproveAllResult('```json\n' + JSON.stringify(obj) + '\n```', titles).ok).toBe(true)
  })

  test('drops entries for section ids the model invented', () => {
    const r = parseImproveAllResult(
      { sections: { unknown_id: '<p>x</p>', s1: '<p>ok</p>' } },
      titles
    )
    expect(r.ok).toBe(true)
    expect(r.bySection).toHaveLength(1)
    expect(r.bySection[0].sectionId).toBe('s1')
  })

  test('drops non-string / blank html values', () => {
    const r = parseImproveAllResult(
      { sections: { s1: '   ', s2: 42 } },
      titles
    )
    expect(r.ok).toBe(false)
  })

  test('trims returned html', () => {
    const r = parseImproveAllResult({ sections: { s1: '  <p>x</p>  ' } }, titles)
    expect(r.bySection[0].html).toBe('<p>x</p>')
  })

  test('supports multiple sections in one response', () => {
    const r = parseImproveAllResult(
      { sections: { s1: '<p>a</p>', s2: '<p>b</p>' } },
      titles
    )
    expect(r.ok).toBe(true)
    expect(r.bySection.map(s => s.sectionId)).toEqual(['s1', 's2'])
  })

  test('returns ok:false on unparseable JSON', () => {
    expect(parseImproveAllResult('not json', titles).ok).toBe(false)
  })

  test('returns ok:false when sections key is missing', () => {
    expect(parseImproveAllResult({ foo: 'bar' }, titles).ok).toBe(false)
  })

  test('returns ok:false when nothing survives validation', () => {
    expect(parseImproveAllResult({ sections: { unknown: '<p>x</p>' } }, titles).ok).toBe(false)
  })
})
