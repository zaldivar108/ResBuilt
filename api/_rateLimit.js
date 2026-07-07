// Best-effort in-memory rate limiter shared by the Edge proxies.
//
// The Groq and O*NET keys are a single shared, project-wide free-tier pool. The
// client soft-cap (src/lib/aiBudget.js) is UX only — trivially bypassed by
// clearing localStorage or calling /api/* directly. This adds a server-side
// per-IP throttle so a scripted caller can't drain the shared quota for
// everyone (an availability risk for a free, no-account product).
//
// LIMITATION: module-scope state lives per warm isolate. Vercel runs many
// isolates across regions and recycles them on cold start, so this slows abuse
// but is NOT a hard, distributed guarantee. For a strict limit, back it with
// Vercel KV / Upstash Redis — the checkRateLimit() contract stays the same.

const buckets = new Map() // ip -> number[] request timestamps within the window
const MAX_TRACKED_IPS = 5000

/** Best-effort client IP from proxy headers. Tolerates a missing headers bag. */
export function clientIp(req) {
  const headers = req?.headers
  if (!headers || typeof headers.get !== 'function') return 'unknown'
  const xff = headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return headers.get('x-real-ip') || 'unknown'
}

/**
 * Sliding-window check. Returns { ok:true } when under the limit, or
 * { ok:false, retryAfter } (seconds) when the caller should back off.
 * @param {Request} req
 * @param {{ limit?: number, windowMs?: number }} [opts]
 */
export function checkRateLimit(req, { limit = 30, windowMs = 60_000 } = {}) {
  const ip = clientIp(req)
  const now = Date.now()
  const cutoff = now - windowMs
  const hits = (buckets.get(ip) || []).filter(t => t > cutoff)

  if (hits.length >= limit) {
    const retryAfter = Math.ceil((hits[0] + windowMs - now) / 1000)
    return { ok: false, retryAfter: Math.max(1, retryAfter) }
  }

  hits.push(now)
  buckets.set(ip, hits)

  // Opportunistic prune so a warm isolate's Map can't grow unbounded.
  if (buckets.size > MAX_TRACKED_IPS) {
    for (const [k, v] of buckets) {
      const kept = v.filter(t => t > cutoff)
      if (kept.length) buckets.set(k, kept)
      else buckets.delete(k)
    }
  }
  return { ok: true }
}

/** Test-only: clear all tracked buckets so cases start from a clean slate. */
export function __resetRateLimit() {
  buckets.clear()
}
