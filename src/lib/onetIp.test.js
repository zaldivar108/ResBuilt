import { describe, test, expect, vi } from 'vitest'
import {
  isValidAnswers,
  fetchProfilerQuestions,
  scoreAnswers,
  matchingCareers,
} from './onetIp.js'

const okJson = body => ({ ok: true, status: 200, json: async () => body })
const errJson = (status, body = {}) => ({ ok: false, status, json: async () => body })

describe('isValidAnswers', () => {
  test('accepts 30 or 60 digits of 1-5', () => {
    expect(isValidAnswers('3'.repeat(30))).toBe(true)
    expect(isValidAnswers('5'.repeat(60))).toBe(true)
  })

  test('rejects wrong length, bad digits, or non-strings', () => {
    expect(isValidAnswers('3'.repeat(29))).toBe(false)
    expect(isValidAnswers('6'.repeat(30))).toBe(false) // 6 out of range
    expect(isValidAnswers('30'.repeat(15))).toBe(false) // contains 0
    expect(isValidAnswers(null)).toBe(false)
  })
})

describe('fetchProfilerQuestions', () => {
  test('calls the proxy questions action and returns options + questions', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okJson({
      options: [{ value: 1, name: 'Strongly Dislike' }],
      questions: [{ index: 1, area: 'realistic', text: 'Build cabinets' }],
    }))
    const out = await fetchProfilerQuestions({ fetchImpl })
    expect(fetchImpl).toHaveBeenCalledWith('/api/onetip?action=questions')
    expect(out.questions[0].text).toBe('Build cabinets')
  })
})

describe('scoreAnswers', () => {
  test('validates before hitting the network', async () => {
    const fetchImpl = vi.fn()
    await expect(scoreAnswers('nope', { fetchImpl })).rejects.toThrow()
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  test('posts the answers and returns the areas', async () => {
    const areas = [{ code: 'social', title: 'Social', description: '', score: 30 }]
    const fetchImpl = vi.fn().mockResolvedValue(okJson({ areas }))
    const out = await scoreAnswers('3'.repeat(30), { fetchImpl })
    expect(fetchImpl).toHaveBeenCalledWith('/api/onetip?action=results&answers=' + '3'.repeat(30))
    expect(out).toEqual(areas)
  })

  test('surfaces the proxy error message', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(errJson(400, { error: 'bad answers' }))
    await expect(scoreAnswers('3'.repeat(30), { fetchImpl })).rejects.toThrow('bad answers')
  })
})

describe('matchingCareers', () => {
  test('builds the RIASEC query in canonical order and returns careers', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okJson({
      total: 42,
      careers: [{ code: '39-2021.00', title: 'Animal Caretakers', brightOutlook: true, fit: 'Best' }],
    }))
    const out = await matchingCareers(
      [{ code: 'social', score: 30 }, { code: 'realistic', score: 10 }],
      { fetchImpl, limit: 5 }
    )
    const url = fetchImpl.mock.calls[0][0]
    expect(url).toContain('action=careers')
    expect(url).toContain('realistic=10&investigative=0&artistic=0&social=30')
    expect(url).toContain('start=1&end=5')
    expect(out.total).toBe(42)
    expect(out.careers[0].title).toBe('Animal Caretakers')
  })
})
