/* global process */
// Vercel Edge Function — server-side proxy to the O*NET Web Services API (v2).
// The ONET_API_KEY never reaches the browser (O*NET requires it in an X-API-Key
// header, GET only). Set it as a Vercel env var (and in .env.local for
// `vercel dev`); see .env.example. Data © O*NET / U.S. Dept. of Labor, CC BY 4.0.
//
// Two GET actions:
//   /api/onet?action=search&keyword=cashier      → { results: [{code,title}] }
//   /api/onet?action=occupation&code=41-2011.00  → { occupation: {code,title,keywords,tasks,skills} }
//     (title passthrough is a fallback; the detail payload normally has it.)

import { normalizeSearch, normalizeCareer, normalizeOnlineTasks } from '../src/lib/onetNormalize.js'
import { checkRateLimit } from './_rateLimit.js'

export const config = { runtime: 'edge' }

const ONET_BASE = 'https://api-v2.onetcenter.org'
const SEARCH_LIMIT = 10

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

export default async function handler(req) {
  if (req.method !== 'GET') return json({ error: 'Method not allowed.' }, 405)

  const rl = checkRateLimit(req, { limit: 60 })
  if (!rl.ok) return json({ error: 'Too many requests — please slow down.' }, 429, { 'Retry-After': String(rl.retryAfter) })

  const key = process.env.ONET_API_KEY
  if (!key) return json({ error: 'O*NET is not configured on the server.' }, 503)

  const url = new URL(req.url)
  const action = url.searchParams.get('action')

  try {
    if (action === 'search') {
      const keyword = (url.searchParams.get('keyword') || '').trim()
      if (!keyword) return json({ results: [] })
      const data = await onetGet(
        `/mnm/search?keyword=${encodeURIComponent(keyword)}&end=${SEARCH_LIMIT}`,
        key
      )
      return json({ results: normalizeSearch(data) })
    }

    if (action === 'occupation') {
      const code = (url.searchParams.get('code') || '').trim()
      const title = (url.searchParams.get('title') || '').trim()
      if (!code) return json({ error: 'Missing occupation code.' }, 400)

      // A single career-detail call carries the tasks (on_the_job), keywords
      // (also_called), and title — no extra round-trips needed.
      const data = await onetGet(`/mnm/careers/${encodeURIComponent(code)}/`, key)
      const occupation = normalizeCareer(data, title)
      if (!occupation) return json({ error: 'That occupation was not found.' }, 404)

      // The mnm `on_the_job` list is only ~3 items. Pull the fuller O*NET task
      // bank (Core-first, importance-ranked) and prefer it when available;
      // fall back silently to on_the_job if that endpoint is unavailable.
      try {
        const tasksData = await onetGet(
          `/online/occupations/${encodeURIComponent(code)}/details/tasks?end=20`,
          key
        )
        const fullerTasks = normalizeOnlineTasks(tasksData)
        if (fullerTasks.length) occupation.tasks = fullerTasks
      } catch { /* keep the on_the_job fallback */ }

      return json({ occupation })
    }

    return json({ error: 'Unknown action.' }, 400)
  } catch (err) {
    // 404 = no such occupation code; anything else is an upstream/network issue.
    const status = err?.status === 404 ? 404 : 502
    const message =
      status === 404
        ? 'That occupation was not found.'
        : 'Could not reach O*NET right now. Try again shortly.'
    return json({ error: message }, status)
  }
}
