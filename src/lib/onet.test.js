import { describe, test, expect, vi } from 'vitest'
import {
  searchOccupations,
  getOccupation,
  searchOccupationsRemote,
  getOccupationRemote,
  bulletsFromTasks,
  occupationToPosting,
} from './onet.js'

const okJson = body => ({ ok: true, status: 200, json: async () => body })

// Fixture shaped like the real O*NET seed so the repository stays pure/testable.
const DATA = [
  { code: '41-2011.00', title: 'Cashiers', keywords: ['cashier', 'checkout', 'register'], tasks: ['Receive payment.'], skills: ['Service Orientation'] },
  { code: '41-2031.00', title: 'Retail Salespersons', keywords: ['retail', 'sales', 'store associate'], tasks: ['Greet customers.'], skills: ['Speaking'] },
  { code: '35-3023.01', title: 'Baristas', keywords: ['barista', 'coffee', 'cafe'], tasks: ['Prepare drinks.'], skills: ['Active Listening'] },
  { code: '39-9011.00', title: 'Childcare Workers', keywords: ['babysitter', 'nanny', 'childcare'], tasks: ['Supervise children.'], skills: ['Monitoring'] },
]

describe('searchOccupations', () => {
  test('matches on the occupation title (case-insensitive)', () => {
    const results = searchOccupations('cashier', { data: DATA })
    expect(results[0]).toMatchObject({ code: '41-2011.00', title: 'Cashiers' })
  })

  test('matches on a keyword, not just the title', () => {
    const results = searchOccupations('babysitter', { data: DATA })
    expect(results[0].title).toBe('Childcare Workers')
  })

  test('returns lightweight {code,title} entries, not full records', () => {
    const [first] = searchOccupations('coffee', { data: DATA })
    expect(first).toEqual({ code: '35-3023.01', title: 'Baristas' })
    expect(first).not.toHaveProperty('tasks')
  })

  test('ranks a title match above a keyword-only match', () => {
    // "sales" hits Retail Salespersons by title; ensure it leads.
    const results = searchOccupations('sales', { data: DATA })
    expect(results[0].title).toBe('Retail Salespersons')
  })

  test('returns an empty array for a blank query', () => {
    expect(searchOccupations('   ', { data: DATA })).toEqual([])
    expect(searchOccupations('', { data: DATA })).toEqual([])
  })

  test('returns an empty array when nothing matches', () => {
    expect(searchOccupations('astronaut', { data: DATA })).toEqual([])
  })

  test('does not match on mid-word substrings (regression: "it")', () => {
    // "it" appears inside "waiters", "babysitter", "activities" — none should match.
    const noise = [
      { code: 'a', title: 'Waiters & Waitresses', keywords: ['server'], tasks: [], skills: [] },
      { code: 'b', title: 'Childcare Workers', keywords: ['babysitter', 'sitter'], tasks: [], skills: [] },
      { code: 'c', title: 'Recreation Workers', keywords: ['activities'], tasks: [], skills: [] },
    ]
    expect(searchOccupations('it', { data: noise })).toEqual([])
  })

  test('matches a word prefix inside a multi-word keyword phrase', () => {
    const results = searchOccupations('store', { data: DATA })
    expect(results[0].title).toBe('Retail Salespersons') // via "store associate"
  })

  test('respects the result limit', () => {
    const results = searchOccupations('e', { data: DATA, limit: 2 })
    expect(results.length).toBeLessThanOrEqual(2)
  })
})

describe('bulletsFromTasks', () => {
  test('wraps selected tasks in a <ul> of <li>s', () => {
    expect(bulletsFromTasks(['Greet customers.', 'Ring up sales.']))
      .toBe('<ul><li>Greet customers.</li><li>Ring up sales.</li></ul>')
  })

  test('skips blanks and returns empty string when nothing is selected', () => {
    expect(bulletsFromTasks(['  ', ''])).toBe('')
    expect(bulletsFromTasks([])).toBe('')
    expect(bulletsFromTasks(undefined)).toBe('')
  })

  test('HTML-escapes task strings so injected markup cannot execute (XSS)', () => {
    const out = bulletsFromTasks(['<img src=x onerror=alert(1)>', 'a & b < c'])
    expect(out).toBe(
      '<ul><li>&lt;img src=x onerror=alert(1)&gt;</li><li>a &amp; b &lt; c</li></ul>'
    )
    expect(out).not.toContain('<img')
  })
})

describe('getOccupation', () => {
  test('returns the full record including tasks and skills', () => {
    const occ = getOccupation('41-2011.00', { data: DATA })
    expect(occ.tasks).toContain('Receive payment.')
    expect(occ.skills).toContain('Service Orientation')
  })

  test('returns null for an unknown code', () => {
    expect(getOccupation('99-9999.99', { data: DATA })).toBeNull()
  })
})

describe('searchOccupationsRemote', () => {
  test('calls the proxy and returns its results', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okJson({ results: [{ code: '1', title: 'A' }] }))
    const out = await searchOccupationsRemote('cook', { fetchImpl })
    expect(out).toEqual([{ code: '1', title: 'A' }])
    expect(fetchImpl).toHaveBeenCalledWith('/api/onet?action=search&keyword=cook')
  })

  test('returns [] for a blank query without hitting the network', async () => {
    const fetchImpl = vi.fn()
    expect(await searchOccupationsRemote('  ', { fetchImpl })).toEqual([])
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  test('throws when the proxy responds not-OK (so callers can fall back to the seed)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) })
    await expect(searchOccupationsRemote('cook', { fetchImpl })).rejects.toThrow()
  })
})

describe('getOccupationRemote', () => {
  test('passes code + title to the proxy and unwraps the occupation', async () => {
    const occ = { code: '41-2011.00', title: 'Cashiers', tasks: ['t'], skills: ['s'] }
    const fetchImpl = vi.fn().mockResolvedValue(okJson({ occupation: occ }))
    const out = await getOccupationRemote('41-2011.00', 'Cashiers', { fetchImpl })
    expect(out).toEqual(occ)
    const calledUrl = fetchImpl.mock.calls[0][0]
    expect(calledUrl).toContain('action=occupation')
    expect(calledUrl).toContain('code=41-2011.00')
    expect(calledUrl).toContain('title=Cashiers')
  })

  test('throws when the proxy responds not-OK', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) })
    await expect(getOccupationRemote('x', 'y', { fetchImpl })).rejects.toThrow()
  })
})

describe('occupationToPosting (career → tailor posting bridge)', () => {
  test('builds title + duty bullets from a full occupation', () => {
    const occ = { title: 'Waiters and Waitresses', tasks: ['Take orders.', 'Serve food.'] }
    const { text, degraded } = occupationToPosting(occ, 'ignored')
    expect(degraded).toBe(false)
    expect(text).toContain('Waiters and Waitresses')
    expect(text).toContain('Typical duties:')
    expect(text).toContain('- Take orders.')
    expect(text).toContain('- Serve food.')
  })

  test('prefers the occupation title over the fallback', () => {
    const occ = { title: 'Real Title', tasks: ['x'] }
    expect(occupationToPosting(occ, 'Fallback').text.startsWith('Real Title')).toBe(true)
  })

  test('degrades to the fallback title when occupation is null', () => {
    expect(occupationToPosting(null, 'Barista')).toEqual({ text: 'Barista', degraded: true })
  })

  test('degrades when the occupation has no usable tasks', () => {
    expect(occupationToPosting({ title: 'Clerk', tasks: [] }, 'x')).toEqual({ text: 'Clerk', degraded: true })
    expect(occupationToPosting({ title: 'Clerk', tasks: ['', '   '] }, 'x').degraded).toBe(true)
  })

  test('trims blank tasks but keeps the real ones', () => {
    const { text } = occupationToPosting({ title: 'Cook', tasks: ['  Grill.  ', '', 'Prep.'] }, '')
    expect(text).toContain('- Grill.')
    expect(text).toContain('- Prep.')
    expect(text).not.toContain('- \n')
  })

  test('returns an empty string, not a crash, when everything is missing', () => {
    expect(occupationToPosting(null, '')).toEqual({ text: '', degraded: true })
  })
})
