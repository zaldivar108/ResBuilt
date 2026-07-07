// Interest Profiler client repository. The ONLY module the UI uses to reach the
// Interest Profiler; it talks to the server-side proxy (api/onetip.js) so the
// API key stays off the device. fetchImpl is injectable for tests.
//
// Data © O*NET / U.S. Dept. of Labor, CC BY 4.0.

import { scoresToCareerQuery } from './onetIpNormalize.js'

const MINI_IP_LENGTH = 30
const DEFAULT_CAREER_LIMIT = 15

/**
 * True when `answers` is a Mini-IP (30) or short-form (60) string of 1-5 digits.
 * @param {string} answers
 * @returns {boolean}
 */
export function isValidAnswers(answers) {
  return typeof answers === 'string'
    && (answers.length === 30 || answers.length === 60)
    && /^[1-5]+$/.test(answers)
}

async function getJson(fetchImpl, path) {
  const res = await fetchImpl(path)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`)
  return data
}

/**
 * Fetch all 30 Mini-IP questions plus the answer scale.
 * @param {{ fetchImpl?: typeof fetch }} [opts]
 * @returns {Promise<{options: Array, questions: Array}>}
 */
export async function fetchProfilerQuestions({ fetchImpl = fetch } = {}) {
  const data = await getJson(fetchImpl, '/api/onetip?action=questions')
  return {
    options: Array.isArray(data?.options) ? data.options : [],
    questions: Array.isArray(data?.questions) ? data.questions : [],
  }
}

/**
 * Score an answer string into the six RIASEC areas (sorted, highest first).
 * @param {string} answers
 * @param {{ fetchImpl?: typeof fetch }} [opts]
 * @returns {Promise<Array<{code,title,description,score}>>}
 */
export async function scoreAnswers(answers, { fetchImpl = fetch } = {}) {
  if (!isValidAnswers(answers)) throw new Error('Please answer every question.')
  const data = await getJson(fetchImpl, `/api/onetip?action=results&answers=${answers}`)
  return Array.isArray(data?.areas) ? data.areas : []
}

/**
 * Fetch careers that match the scored RIASEC areas.
 * @param {Array<{code,score}>} areas
 * @param {{ fetchImpl?: typeof fetch, limit?: number }} [opts]
 * @returns {Promise<{total:number, careers:Array}>}
 */
export async function matchingCareers(areas, { fetchImpl = fetch, limit = DEFAULT_CAREER_LIMIT } = {}) {
  const query = scoresToCareerQuery(areas)
  const data = await getJson(fetchImpl, `/api/onetip?action=careers&${query}&start=1&end=${limit}`)
  return {
    total: Number(data?.total) || 0,
    careers: Array.isArray(data?.careers) ? data.careers : [],
  }
}

export { MINI_IP_LENGTH }
