// Pure normalizers for the O*NET Web Services API (v2, api-v2.onetcenter.org).
//
// Kept pure (no fetch) so the api/onet.js proxy and the unit tests share them.
// Verified against the live v2 responses:
//   /mnm/search           → { career: [{ code, title, tags }] }
//   /mnm/careers/{code}/  → { code, title, on_the_job: [string],
//                             also_called: [{ title }], what_they_do }
// "on_the_job" is My Next Move's short, plain-language task list — a better fit
// for a first résumé than the full O*NET task bank.

const MAX_TASKS = 15
const MAX_KEYWORDS = 12

/**
 * Keyword-search response → lightweight [{ code, title }] (search contract).
 * @param {any} json
 * @returns {Array<{ code: string, title: string }>}
 */
export function normalizeSearch(json) {
  const list = Array.isArray(json?.career) ? json.career : []
  return list
    .map(o => ({
      code: typeof o?.code === 'string' ? o.code.trim() : '',
      title: typeof o?.title === 'string' ? o.title.trim() : '',
    }))
    .filter(o => o.code && o.title)
}

/**
 * Career-detail response → the full occupation record the app consumes
 * ({ code, title, keywords, tasks, skills }). `fallbackTitle` is the title from
 * the earlier search result, used if the detail payload somehow omits it.
 * @param {any} json
 * @param {string} [fallbackTitle]
 * @returns {{ code: string, title: string, keywords: string[], tasks: string[], skills: string[] } | null}
 */
export function normalizeCareer(json, fallbackTitle = '') {
  if (!json || typeof json !== 'object') return null
  const code = typeof json.code === 'string' ? json.code.trim() : ''
  if (!code) return null

  const tasks = (Array.isArray(json.on_the_job) ? json.on_the_job : [])
    .filter(t => typeof t === 'string' && t.trim())
    .map(t => t.trim())
    .slice(0, MAX_TASKS)

  const keywords = (Array.isArray(json.also_called) ? json.also_called : [])
    .map(a => (typeof a?.title === 'string' ? a.title.trim() : ''))
    .filter(Boolean)
    .slice(0, MAX_KEYWORDS)

  return {
    code,
    title: (typeof json.title === 'string' && json.title.trim()) || fallbackTitle,
    keywords,
    tasks,
    skills: [], // not surfaced in the UI; kept for record-shape parity with the seed
  }
}

/**
 * Online task-detail response → a fuller task list than My Next Move's short
 * `on_the_job`. Source: /online/occupations/{code}/details/tasks
 *   → { task: [{ title, importance, category }] }
 * Core tasks lead, then by descending importance; capped at MAX_TASKS.
 * @param {any} json
 * @returns {string[]}
 */
export function normalizeOnlineTasks(json) {
  const list = Array.isArray(json?.task) ? json.task : []
  return list
    .map(t => ({
      title: typeof t?.title === 'string' ? t.title.trim() : '',
      importance: Number(t?.importance) || 0,
      isCore: t?.category === 'Core',
    }))
    .filter(t => t.title)
    .sort((a, b) => (a.isCore === b.isCore ? 0 : a.isCore ? -1 : 1) || b.importance - a.importance)
    .map(t => t.title)
    .slice(0, MAX_TASKS)
}
