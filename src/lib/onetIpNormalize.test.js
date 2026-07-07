import { describe, test, expect } from 'vitest'
import {
  normalizeQuestions,
  normalizeResults,
  normalizeCareers,
  scoresToCareerQuery,
} from './onetIpNormalize.js'

// Fixtures copied from live api-v2.onetcenter.org responses.
const QUESTIONS_JSON = {
  start: 1,
  end: 12,
  total: 30,
  answer_option: [
    { value: 1, name: 'Strongly Dislike' },
    { value: 3, name: 'Unsure' },
    { value: 5, name: 'Strongly Like' },
  ],
  question: [
    { index: 1, area: 'realistic', text: 'Build kitchen cabinets' },
    { index: 2, area: 'investigative', text: 'Develop a new medicine' },
  ],
}

const RESULTS_JSON = {
  result: [
    { code: 'realistic', title: 'Realistic', description: 'hands-on', score: 10 },
    { code: 'social', title: 'Social', description: 'help others', score: 30 },
    { code: 'artistic', title: 'Artistic', description: 'creative', score: 5 },
  ],
}

const CAREERS_JSON = {
  total: 226,
  career: [
    { href: 'x', code: '39-2021.00', title: 'Animal Caretakers', tags: { bright_outlook: true }, fit: 'Best' },
    { href: 'y', code: '45-2021.00', title: 'Animal Breeders', tags: {}, fit: 'Best' },
    { href: 'z', code: '', title: '', tags: {}, fit: 'Best' }, // junk, dropped
  ],
}

describe('normalizeQuestions', () => {
  test('extracts total, options, and questions', () => {
    const out = normalizeQuestions(QUESTIONS_JSON)
    expect(out.total).toBe(30)
    expect(out.options).toHaveLength(3)
    expect(out.options[0]).toEqual({ value: 1, name: 'Strongly Dislike' })
    expect(out.questions[0]).toEqual({ index: 1, area: 'realistic', text: 'Build kitchen cabinets' })
  })

  test('is defensive against a missing payload', () => {
    expect(normalizeQuestions(null)).toEqual({ total: 0, options: [], questions: [] })
  })
})

describe('normalizeResults', () => {
  test('sorts the six areas by score, highest first', () => {
    const out = normalizeResults(RESULTS_JSON)
    expect(out.map(a => a.code)).toEqual(['social', 'realistic', 'artistic'])
    expect(out[0].score).toBe(30)
  })

  test('returns [] for a missing payload', () => {
    expect(normalizeResults(undefined)).toEqual([])
  })
})

describe('normalizeCareers', () => {
  test('maps careers, flags bright outlook, and drops junk rows', () => {
    const out = normalizeCareers(CAREERS_JSON)
    expect(out.total).toBe(226)
    expect(out.careers).toHaveLength(2)
    expect(out.careers[0]).toEqual({
      code: '39-2021.00',
      title: 'Animal Caretakers',
      brightOutlook: true,
      fit: 'Best',
    })
    expect(out.careers[1].brightOutlook).toBe(false)
  })
})

describe('scoresToCareerQuery', () => {
  test('emits all six RIASEC codes in canonical order, defaulting missing to 0', () => {
    const q = scoresToCareerQuery([
      { code: 'social', score: 30 },
      { code: 'realistic', score: 10 },
    ])
    expect(q).toBe('realistic=10&investigative=0&artistic=0&social=30&enterprising=0&conventional=0')
  })
})
