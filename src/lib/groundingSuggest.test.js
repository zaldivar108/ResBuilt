import { describe, test, expect, vi } from 'vitest'
import { suggestGroundingOccupation } from './groundingSuggest.js'

// A stub search: prefix-matches a fixed set of query words against a hit's
// key, mirroring real searchOccupations word-prefix semantics (e.g. "barista"
// matches a "baristas" entry). Keeps these tests independent of seed data.
function stubSearch(hits) {
  return vi.fn(query => {
    const q = query.toLowerCase()
    const key = Object.keys(hits).find(k => k.startsWith(q))
    return key ? [hits[key]] : []
  })
}

const BARISTA = { code: '35-3023.00', title: 'Baristas' }
const CASHIER = { code: '41-2011.00', title: 'Cashiers' }

describe('suggestGroundingOccupation', () => {
  test('returns null for a null/undefined resume', () => {
    const searchFn = stubSearch({})
    expect(suggestGroundingOccupation(null, { searchFn })).toBeNull()
    expect(suggestGroundingOccupation(undefined, { searchFn })).toBeNull()
  })

  test('returns null when nothing matches anywhere', () => {
    const searchFn = stubSearch({})
    const resume = { title: 'Untitled Resume', sections: [] }
    expect(suggestGroundingOccupation(resume, { searchFn })).toBeNull()
  })

  test('prefers targetJob.title (explicit intent) over a title guess', () => {
    const searchFn = stubSearch({ 'baristas': BARISTA, 'cashier': CASHIER })
    const resume = {
      title: 'Cashier Resume',
      targetJob: { title: 'Baristas', text: 'Baristas', source: 'quiz' },
      sections: [],
    }
    const result = suggestGroundingOccupation(resume, { searchFn })
    expect(result).toEqual({ ...BARISTA, source: 'targetJob' })
  })

  test('derives a term from targetJob.text when no title is set', () => {
    const searchFn = stubSearch({ cashier: CASHIER })
    const resume = {
      title: 'My Resume',
      targetJob: { text: 'Looking for a cashier position at a local store', source: 'pasted' },
      sections: [],
    }
    const result = suggestGroundingOccupation(resume, { searchFn })
    expect(result).toEqual({ ...CASHIER, source: 'targetJob' })
  })

  test('falls back to a stripped résumé title when there is no targetJob', () => {
    const searchFn = stubSearch({ baristas: BARISTA })
    const resume = { title: 'Barista Resume', sections: [] }
    const result = suggestGroundingOccupation(resume, { searchFn })
    expect(result).toEqual({ ...BARISTA, source: 'title' })
  })

  test('strips filler words ("Résumé", "CV", articles) before searching the title', () => {
    const searchFn = stubSearch({ cashier: CASHIER })
    const resume = { title: 'My Cashier CV', sections: [] }
    expect(suggestGroundingOccupation(resume, { searchFn })).toEqual({ ...CASHIER, source: 'title' })
  })

  test('falls back to the summary/objective section text when the title has no match', () => {
    const searchFn = stubSearch({ barista: BARISTA })
    const resume = {
      title: 'My Resume',
      sections: [
        { type: 'contact', content: '<p>Jane Doe</p>' },
        { type: 'summary', content: '<p>Hoping to work as a barista downtown.</p>' },
      ],
    }
    const result = suggestGroundingOccupation(resume, { searchFn })
    expect(result).toEqual({ ...BARISTA, source: 'objective' })
  })

  test('ignores a hidden summary section', () => {
    const searchFn = stubSearch({ barista: BARISTA })
    const resume = {
      title: 'My Resume',
      sections: [{ type: 'summary', hidden: true, content: '<p>Hoping to work as a barista.</p>' }],
    }
    expect(suggestGroundingOccupation(resume, { searchFn })).toBeNull()
  })

  test('a targetJob with no match falls through to the title guess', () => {
    const searchFn = stubSearch({ baristas: BARISTA })
    const resume = {
      title: 'Baristas Resume',
      targetJob: { text: 'Some posting with nothing recognizable', source: 'pasted' },
      sections: [],
    }
    expect(suggestGroundingOccupation(resume, { searchFn })).toEqual({ ...BARISTA, source: 'title' })
  })
})
