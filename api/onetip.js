/* global process */
// Vercel Edge Function — server-side proxy to the O*NET Interest Profiler
// (Mini-IP) Web Services v2. Shares the ONET_API_KEY with api/onet.js; the key
// never reaches the browser (O*NET requires it in an X-API-Key header, GET only).
// Data © O*NET / U.S. Dept. of Labor, CC BY 4.0.
//
// Three GET actions:
//   /api/onetip?action=questions
//     → { options:[{value,name}], questions:[{index,area,text}] }  (all 30)
//   /api/onetip?action=results&answers=<30 digits 1-5>
//     → { areas:[{code,title,description,score}] }  (RIASEC, sorted desc)
//   /api/onetip?action=careers&realistic=..&...&start=1&end=15
//     → { total, careers:[{code,title,brightOutlook,fit}] }

import {
  normalizeQuestions,
  normalizeResults,
  normalizeCareers,
  RIASEC_ORDER,
} from '../src/lib/onetIpNormalize.js'
import { checkRateLimit } from './_rateLimit.js'

export const config = { runtime: 'edge' }

const ONET_BASE = 'https://api-v2.onetcenter.org'
const IP = '/mnm/interestprofiler'
const CAREERS_LIMIT = 15
// Mini-IP is 30 items; the full short form is 60. Accept either length.
const VALID_ANSWER_LENGTHS = new Set([30, 60])

function json(obj, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  })
}

// One authenticated GET to O*NET, parsed as JSON. Throws on a non-OK response.
async function onetGet(path, key) {
  const res = await fetch(`${ONET_BASE}${path}`, {
    headers: { 'X-API-Key': key, Accept: 'application/json' },
  })
  if (!res.ok) {
    const err = new Error(`O*NET responded ${res.status}`)
    err.status = res.status
    throw err
  }
  return res.json()
}

// The questions endpoint paginates (12 per page); follow `next` until all are
// collected so the client gets one clean list.
async function fetchAllQuestions(key) {
  let url = `${IP}/questions_30`
  let options = []
  const questions = []
  // Bounded loop: 30 items / 12 per page = 3 requests max; cap at 5 for safety.
  for (let i = 0; i < 5 && url; i++) {
    const page = await onetGet(url, key)
    const norm = normalizeQuestions(page)
    if (!options.length) options = norm.options
    questions.push(...norm.questions)
    const next = page?.next
    url = typeof next === 'string' ? next.replace(ONET_BASE, '') : null
  }
  return { options, questions }
}

function isValidAnswers(answers) {
  return VALID_ANSWER_LENGTHS.has(answers.length) && /^[1-5]+$/.test(answers)
}

export default async function handler(req) {
  if (req.method !== 'GET') return json({ error: 'Method not allowed.' }, 405)

  const rl = checkRateLimit(req, { limit: 60 })
  if (!rl.ok) return json({ error: 'Too many requests — please slow down.' }, 429, { 'Retry-After': String(rl.retryAfter) })

  const key = process.env.ONET_API_KEY
  if (!key) return json({ error: 'O*NET is not configured on the server.' }, 503)

  const url = new URL(req.url)
  const action = url.searchParams.get('action')

  try {
    if (action === 'questions') {
      return json(await fetchAllQuestions(key))
    }

    if (action === 'results') {
      const answers = (url.searchParams.get('answers') || '').trim()
      if (!isValidAnswers(answers)) {
        return json({ error: 'Answers must be 30 or 60 digits, each 1-5.' }, 400)
      }
      const data = await onetGet(`${IP}/results?answers=${answers}`, key)
      return json({ areas: normalizeResults(data) })
    }

    if (action === 'careers') {
      // Forward only the six RIASEC scores plus pagination — never arbitrary keys.
      const parts = RIASEC_ORDER.map(code => {
        const v = Math.trunc(Number(url.searchParams.get(code)))
        return `${code}=${Number.isFinite(v) && v >= 0 ? v : 0}`
      })
      const start = Math.trunc(Number(url.searchParams.get('start'))) || 1
      const end = Math.trunc(Number(url.searchParams.get('end'))) || CAREERS_LIMIT
      const query = `${parts.join('&')}&start=${start}&end=${end}`
      const data = await onetGet(`${IP}/careers?${query}`, key)
      return json(normalizeCareers(data))
    }

    return json({ error: 'Unknown action.' }, 400)
  } catch (err) {
    const status = err?.status === 404 ? 404 : 502
    const message =
      status === 404
        ? 'Not found.'
        : 'Could not reach O*NET right now. Try again shortly.'
    return json({ error: message }, status)
  }
}
