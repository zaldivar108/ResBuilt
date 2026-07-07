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

// Higher score = better match. Title hits beat keyword-only hits.
function scoreMatch(occ, q) {
  const title = occ.title.toLowerCase()
  if (title === q) return 4
  if (title.startsWith(q)) return 3
  if (title.includes(q)) return 2
  if ((occ.keywords ?? []).some(k => k.toLowerCase().includes(q))) return 1
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
