import { describe, test, expect } from 'vitest'
import { diffSectionText } from './diffPreview.js'

describe('diffSectionText', () => {
  test('identical input produces no added/removed marks', async () => {
    const segs = await diffSectionText('<p>Helped customers daily</p>', '<p>Helped customers daily</p>')
    expect(segs.some(s => s.added || s.removed)).toBe(false)
  })

  test('a changed word shows as a removed + added pair', async () => {
    const segs = await diffSectionText('<p>Helped customers daily</p>', '<p>Assisted customers daily</p>')
    expect(segs.some(s => s.removed && s.value.includes('Helped'))).toBe(true)
    expect(segs.some(s => s.added && s.value.includes('Assisted'))).toBe(true)
  })

  test('diffs the text layer, not markup — pure structure changes show no marks', async () => {
    const segs = await diffSectionText('<p>Helped customers daily</p>', '<ul><li>Helped customers daily</li></ul>')
    expect(segs.some(s => s.added || s.removed)).toBe(false)
  })

  test('an appended word shows as a single added segment', async () => {
    const segs = await diffSectionText('<p>Helped customers</p>', '<p>Helped customers daily</p>')
    const added = segs.filter(s => s.added)
    expect(added).toHaveLength(1)
    expect(added[0].value).toContain('daily')
  })

  test('empty before, non-empty after: everything is added', async () => {
    const segs = await diffSectionText('', '<p>Brand new content</p>')
    expect(segs.every(s => s.added || !s.value.trim())).toBe(true)
  })

  test('handles null/undefined content without throwing', async () => {
    const segs = await diffSectionText(null, undefined)
    expect(segs.some(s => s.added || s.removed)).toBe(false)
  })
})
