// Tiny localStorage cache for AI results, keyed by task + input text.
//
// Groq's free tier shares one daily token pool across ALL users of the app, so
// re-running the same request (clicking "Improve" twice on unchanged text)
// wastes quota everyone shares. This caches the result so the second call is
// free. The store is injectable for testing; defaults to localStorage.

const KEY = 'resbuilt_ai_cache'
const MAX_ENTRIES = 40

// Cheap, stable string hash (djb2) — we only need collision-resistance enough
// to key a local cache, not cryptographic strength.
function hash(str) {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

export function cacheKey(task, text) {
  return `${task}:${hash(text ?? '')}`
}

function read(store) {
  try {
    return JSON.parse(store.getItem(KEY)) || {}
  } catch {
    return {}
  }
}

/** @returns {string | null} the cached result, or null on a miss. */
export function getCached(task, text, store = localStorage) {
  const cache = read(store)
  const entry = cache[cacheKey(task, text)]
  return entry?.result ?? null
}

/** Store a result, trimming the oldest entries past MAX_ENTRIES. */
export function setCached(task, text, result, store = localStorage) {
  try {
    const cache = read(store)
    const key = cacheKey(task, text)
    delete cache[key] // re-insert so a refreshed entry counts as newest
    cache[key] = { result }
    // Keep newest MAX_ENTRIES by insertion order (object key order is stable).
    const keys = Object.keys(cache)
    if (keys.length > MAX_ENTRIES) {
      for (const k of keys.slice(0, keys.length - MAX_ENTRIES)) delete cache[k]
    }
    store.setItem(KEY, JSON.stringify(cache))
  } catch {
    // Storage full or unavailable — caching is best-effort, never fatal.
  }
}
