// Pure normalizers for the O*NET Interest Profiler (Mini-IP) Web Services v2 JSON.
// Kept side-effect-free so both the Edge proxy (api/onetip.js) and tests can use
// them. Shapes verified against the live api-v2.onetcenter.org responses.
//
// Data © O*NET / U.S. Dept. of Labor, CC BY 4.0.

const RIASEC_ORDER = [
  'realistic',
  'investigative',
  'artistic',
  'social',
  'enterprising',
  'conventional',
]

/**
 * Normalize a questions page (`/mnm/interestprofiler/questions_30`).
 * @param {object} json
 * @returns {{ total: number, options: Array<{value:number,name:string}>,
 *   questions: Array<{index:number,area:string,text:string}> }}
 */
export function normalizeQuestions(json) {
  const options = Array.isArray(json?.answer_option)
    ? json.answer_option
        .map(o => ({ value: Number(o?.value), name: String(o?.name ?? '') }))
        .filter(o => Number.isFinite(o.value))
    : []
  const questions = Array.isArray(json?.question)
    ? json.question
        .map(q => ({
          index: Number(q?.index),
          area: String(q?.area ?? ''),
          text: String(q?.text ?? ''),
        }))
        .filter(q => Number.isFinite(q.index) && q.text)
    : []
  return { total: Number(json?.total) || questions.length, options, questions }
}

/**
 * Normalize the results/scoring payload (`/mnm/interestprofiler/results`).
 * Returns the six RIASEC areas sorted by score (highest first).
 * @param {object} json
 * @returns {Array<{code:string,title:string,description:string,score:number}>}
 */
export function normalizeResults(json) {
  const rows = Array.isArray(json?.result) ? json.result : []
  return rows
    .map(r => ({
      code: String(r?.code ?? ''),
      title: String(r?.title ?? ''),
      description: String(r?.description ?? ''),
      score: Number(r?.score) || 0,
    }))
    .filter(r => r.code)
    .sort((a, b) => b.score - a.score)
}

/**
 * Normalize the matching-careers payload (`/mnm/interestprofiler/careers`).
 * @param {object} json
 * @returns {{ total: number, careers: Array<{code:string,title:string,
 *   brightOutlook:boolean,fit:string}> }}
 */
export function normalizeCareers(json) {
  const rows = Array.isArray(json?.career) ? json.career : []
  const careers = rows
    .map(c => ({
      code: String(c?.code ?? ''),
      title: String(c?.title ?? ''),
      brightOutlook: Boolean(c?.tags?.bright_outlook),
      fit: String(c?.fit ?? ''),
    }))
    .filter(c => c.code && c.title)
  return { total: Number(json?.total) || careers.length, careers }
}

/**
 * Build the RIASEC query string the careers endpoint expects from scored areas.
 * @param {Array<{code:string,score:number}>} areas
 * @returns {string} e.g. "realistic=30&investigative=10&..."
 */
export function scoresToCareerQuery(areas) {
  const byCode = new Map((areas ?? []).map(a => [a.code, Number(a.score) || 0]))
  return RIASEC_ORDER.map(code => `${code}=${byCode.get(code) ?? 0}`).join('&')
}

export { RIASEC_ORDER }
