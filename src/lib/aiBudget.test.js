import { describe, test, expect } from 'vitest'
import { DAILY_LIMIT, canUseAI, recordUse, remaining } from './aiBudget.js'

function memStore(init = {}) {
  const m = new Map(Object.entries(init))
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k),
  }
}

const TODAY = '2026-07-06'

describe('aiBudget', () => {
  test('allows use with a fresh store', () => {
    expect(canUseAI(TODAY, memStore())).toBe(true)
    expect(remaining(TODAY, memStore())).toBe(DAILY_LIMIT)
  })

  test('counts uses down toward the limit', () => {
    const store = memStore()
    recordUse(TODAY, store)
    recordUse(TODAY, store)
    expect(remaining(TODAY, store)).toBe(DAILY_LIMIT - 2)
  })

  test('blocks once the daily limit is reached', () => {
    const store = memStore()
    for (let i = 0; i < DAILY_LIMIT; i++) recordUse(TODAY, store)
    expect(canUseAI(TODAY, store)).toBe(false)
    expect(remaining(TODAY, store)).toBe(0)
  })

  test('resets when the day changes', () => {
    const store = memStore()
    for (let i = 0; i < DAILY_LIMIT; i++) recordUse(TODAY, store)
    expect(canUseAI(TODAY, store)).toBe(false)
    expect(canUseAI('2026-07-07', store)).toBe(true)
  })

  test('tolerates a corrupted store', () => {
    const store = memStore({ resbuilt_ai_budget: 'garbage' })
    expect(canUseAI(TODAY, store)).toBe(true)
  })
})
