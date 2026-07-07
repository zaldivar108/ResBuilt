// Normalize the AI `tailor` response (job-posting gap analysis) into clean,
// trusted arrays. Never trust the model's shape: parse defensively, coerce to
// strings, drop blanks, cap counts. Pure and testable.

const MAX_SUGGESTIONS = 3

function coerceToObject(raw) {
  if (raw && typeof raw === 'object') return raw
  if (typeof raw !== 'string') return null
  const unfenced = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  try {
    return JSON.parse(unfenced)
  } catch {
    return null
  }
}

function cleanList(value, limit = Infinity) {
  if (!Array.isArray(value)) return []
  return value
    .filter(v => typeof v === 'string' && v.trim())
    .map(v => v.trim())
    .slice(0, limit)
}

/**
 * @param {unknown} raw - the AI tailor response (object or JSON string)
 * @returns {{ ok: true, matched: string[], missing: string[], suggestions: string[] } | { ok: false, error: string }}
 */
export function parseTailorResult(raw) {
  const obj = coerceToObject(raw)
  if (!obj || typeof obj !== 'object') {
    return { ok: false, error: 'We couldn’t read the job-match results. Please try again.' }
  }

  const matched = cleanList(obj.matched)
  const missing = cleanList(obj.missing)
  const suggestions = cleanList(obj.suggestions, MAX_SUGGESTIONS)

  if (!matched.length && !missing.length && !suggestions.length) {
    return { ok: false, error: 'No job-match results were returned. Please try again.' }
  }
  return { ok: true, matched, missing, suggestions }
}
