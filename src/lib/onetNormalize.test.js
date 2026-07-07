import { describe, test, expect } from 'vitest'
import { normalizeSearch, normalizeCareer, normalizeOnlineTasks } from './onetNormalize'

describe('normalizeOnlineTasks', () => {
  test('sorts Core before Supplemental, then by descending importance, and keeps titles', () => {
    const json = {
      task: [
        { title: 'Supplemental high', importance: 90, category: 'Supplemental' },
        { title: 'Core low', importance: 40, category: 'Core' },
        { title: 'Core high', importance: 95, category: 'Core' },
        { title: '  ', importance: 99, category: 'Core' }, // blank dropped
      ],
    }
    expect(normalizeOnlineTasks(json)).toEqual(['Core high', 'Core low', 'Supplemental high'])
  })

  test('returns [] for a missing payload', () => {
    expect(normalizeOnlineTasks(null)).toEqual([])
  })
})

describe('normalizeSearch', () => {
  test('maps the career array to {code,title}', () => {
    const json = {
      career: [
        { href: 'x', code: '41-2011.00', title: 'Cashiers', tags: { bright_outlook: true } },
        { code: '35-3023.01', title: 'Baristas' },
      ],
    }
    expect(normalizeSearch(json)).toEqual([
      { code: '41-2011.00', title: 'Cashiers' },
      { code: '35-3023.01', title: 'Baristas' },
    ])
  })

  test('drops entries missing a code or title', () => {
    const json = { career: [{ code: '', title: 'No code' }, { code: '1', title: '' }] }
    expect(normalizeSearch(json)).toEqual([])
  })

  test('returns [] for a shape with no career list', () => {
    expect(normalizeSearch({})).toEqual([])
    expect(normalizeSearch(null)).toEqual([])
  })
})

describe('normalizeCareer', () => {
  const careerJson = {
    code: '41-2011.00',
    title: 'Cashiers',
    on_the_job: [
      'Receive payment by cash, check, credit cards, vouchers, or automatic debits.',
      'Greet customers entering establishments.',
    ],
    also_called: [{ title: 'Checker' }, { title: 'Store Clerk' }],
    what_they_do: 'Receive and disburse money…',
  }

  test('builds the full record from on_the_job + also_called', () => {
    const occ = normalizeCareer(careerJson)
    expect(occ).toMatchObject({
      code: '41-2011.00',
      title: 'Cashiers',
      keywords: ['Checker', 'Store Clerk'],
      skills: [],
    })
    expect(occ.tasks).toContain('Greet customers entering establishments.')
    expect(occ.tasks.length).toBe(2)
  })

  test('falls back to the passed title when the payload lacks one', () => {
    const occ = normalizeCareer({ code: '99-1234.00', on_the_job: [] }, 'My Job')
    expect(occ.title).toBe('My Job')
  })

  test('caps tasks at 15', () => {
    const json = { code: 'x', on_the_job: Array.from({ length: 30 }, (_, i) => `Task ${i}`) }
    expect(normalizeCareer(json).tasks.length).toBe(15)
  })

  test('returns null without a code', () => {
    expect(normalizeCareer({ title: 'No code' })).toBeNull()
    expect(normalizeCareer(null)).toBeNull()
  })
})
