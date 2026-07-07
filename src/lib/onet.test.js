import { describe, test, expect } from 'vitest'
import { searchOccupations, getOccupation, bulletsFromTasks } from './onet.js'

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
