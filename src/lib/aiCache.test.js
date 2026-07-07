import { describe, test, expect } from 'vitest'
import { getCached, setCached, cacheKey } from './aiCache.js'

// Simple in-memory stand-in for the Storage API.
function memStore(init = {}) {
  const m = new Map(Object.entries(init))
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k),
  }
}

describe('cacheKey', () => {
  test('is stable for the same task + text and differs otherwise', () => {
    expect(cacheKey('improve', 'hello')).toBe(cacheKey('improve', 'hello'))
    expect(cacheKey('improve', 'hello')).not.toBe(cacheKey('improve', 'world'))
    expect(cacheKey('improve', 'hello')).not.toBe(cacheKey('ideas', 'hello'))
  })
})

describe('getCached / setCached', () => {
  test('returns null on a miss', () => {
    expect(getCached('improve', 'x', memStore())).toBeNull()
  })

  test('round-trips a stored result', () => {
    const store = memStore()
    setCached('improve', 'my text', '<p>better</p>', store)
    expect(getCached('improve', 'my text', store)).toBe('<p>better</p>')
  })

  test('misses when the text changes', () => {
    const store = memStore()
    setCached('improve', 'my text', '<p>better</p>', store)
    expect(getCached('improve', 'different', store)).toBeNull()
  })

  test('tolerates a corrupted store without throwing', () => {
    const store = memStore({ resbuilt_ai_cache: 'not json {{{' })
    expect(getCached('improve', 'x', store)).toBeNull()
    expect(() => setCached('improve', 'x', '<p>ok</p>', store)).not.toThrow()
  })
})
