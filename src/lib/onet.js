// O*NET occupation repository.
//
// This is the ONLY module the app uses to reach occupation data, so the source
// can change without touching callers. Today it reads a bundled seed
// (src/config/onetData.js); when the O*NET Web Services API key is approved (or
// the full bulk DB is extracted), swap the default `data` / make these async —
// the {code,title} search contract and getOccupation shape stay the same.
//
// Data © O*NET / U.S. Department of Labor, CC BY 4.0 — see onetData.js.

import { OCCUPATIONS } from '../config/onetData.js'

const DEFAULT_LIMIT = 8

// True when any whole word in `text` starts with `q`. Word-prefix (not raw
// substring) matching keeps "cash"→"Cashiers" while rejecting junk like
// "it"→"waiters"/"babysitter"/"activities".
function wordStartsWith(text, q) {
  return text.split(/[^a-z0-9]+/i).some(w => w.startsWith(q))
}

// Higher score = better match. Title hits beat keyword-only hits.
function scoreMatch(occ, q) {
  const title = occ.title.toLowerCase()
  if (title === q) return 4
  if (title.startsWith(q)) return 3
  if (wordStartsWith(title, q)) return 2
  if ((occ.keywords ?? []).some(k => wordStartsWith(k.toLowerCase(), q))) return 1
  return 0
}

/**
 * Search occupations by title or keyword.
 * @param {string} query
 * @param {{ data?: Array, limit?: number }} [opts]
 * @returns {Array<{ code: string, title: string }>}
 */
export function searchOccupations(query, { data = OCCUPATIONS, limit = DEFAULT_LIMIT } = {}) {
  const q = (query ?? '').trim().toLowerCase()
  if (!q) return []

  return data
    .map(occ => ({ occ, score: scoreMatch(occ, q) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.occ.title.localeCompare(b.occ.title))
    .slice(0, limit)
    .map(({ occ }) => ({ code: occ.code, title: occ.title }))
}

/**
 * Build an HTML bullet list from selected task strings, ready to append to a
 * section's content. Skips blanks; returns '' when nothing is selected.
 * @param {string[]} tasks
 * @returns {string}
 */
export function bulletsFromTasks(tasks) {
  const items = (tasks ?? [])
    .filter(t => typeof t === 'string' && t.trim())
    .map(t => `<li>${t.trim()}</li>`)
  return items.length ? `<ul>${items.join('')}</ul>` : ''
}

/**
 * Look up a full occupation record (tasks + skills) by O*NET-SOC code.
 * @param {string} code
 * @param {{ data?: Array }} [opts]
 * @returns {object | null}
 */
export function getOccupation(code, { data = OCCUPATIONS } = {}) {
  return data.find(occ => occ.code === code) ?? null
}

// --- Live O*NET (via the /api/onet proxy) -------------------------------
// These hit the server-side proxy so the full O*NET catalog is available when
// ONET_API_KEY is configured. Callers fall back to the bundled seed above when
// these reject (proxy not configured, offline, rate-limited) — so search always
// works, just with less coverage. fetchImpl is injectable for tests.

/**
 * Search the live O*NET catalog through the proxy.
 * @param {string} query
 * @param {{ fetchImpl?: typeof fetch }} [opts]
 * @returns {Promise<Array<{ code: string, title: string }>>}
 */
export async function searchOccupationsRemote(query, { fetchImpl = fetch } = {}) {
  const q = (query ?? '').trim()
  if (!q) return []
  const res = await fetchImpl(`/api/onet?action=search&keyword=${encodeURIComponent(q)}`)
  if (!res.ok) throw new Error(`O*NET search failed (${res.status})`)
  const data = await res.json()
  return Array.isArray(data?.results) ? data.results : []
}

/**
 * Fetch a full live occupation record through the proxy. Title is passed
 * through from the search result so the proxy needn't spend a call to fetch it.
 * @param {string} code
 * @param {string} title
 * @param {{ fetchImpl?: typeof fetch }} [opts]
 * @returns {Promise<object | null>}
 */
export async function getOccupationRemote(code, title = '', { fetchImpl = fetch } = {}) {
  const params = new URLSearchParams({ action: 'occupation', code, title })
  const res = await fetchImpl(`/api/onet?${params}`)
  if (!res.ok) throw new Error(`O*NET lookup failed (${res.status})`)
  const data = await res.json()
  return data?.occupation ?? null
}
