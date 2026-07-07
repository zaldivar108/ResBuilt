// Per-browser daily AI-usage budget.
//
// Groq's free tier is a single shared token pool. A soft per-device daily cap
// keeps one enthusiastic user from draining the quota for everyone, and fails
// with a friendly "come back tomorrow" instead of an opaque 429. `today` (a
// YYYY-MM-DD string) is passed in so the logic stays pure/testable; the store
// is injectable and defaults to localStorage.

const KEY = 'resbuilt_ai_budget'

/** Soft cap on AI actions per device per day. Generous for real résumé work. */
export const DAILY_LIMIT = 25

function read(store) {
  try {
    const v = JSON.parse(store.getItem(KEY))
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}

// Usage count for `today`; anything from a previous day resets to 0.
function countFor(today, store) {
  const state = read(store)
  return state.date === today && typeof state.count === 'number' ? state.count : 0
}

export function remaining(today, store = localStorage) {
  return Math.max(0, DAILY_LIMIT - countFor(today, store))
}

export function canUseAI(today, store = localStorage) {
  return remaining(today, store) > 0
}

/** Record one AI use for today; returns the new count. */
export function recordUse(today, store = localStorage) {
  const count = countFor(today, store) + 1
  try {
    store.setItem(KEY, JSON.stringify({ date: today, count }))
  } catch {
    // best-effort
  }
  return count
}
