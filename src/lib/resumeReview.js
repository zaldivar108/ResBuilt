// Client-side plumbing for the AI whole-résumé `review` task (ADR 0002 /
// issue 002): builds the PII-scrubbed, per-section-capped prompt text sent to
// api/ai.js, and parses its JSON response back into a safe, normalized shape.
// Pure and testable — no fetch here (the caller owns the network call, same
// split as tailor.js/parseTailorResult).

import { htmlToText } from './resumeChecklist'
import { scrubPii } from './scrubPii'

// Keeps a realistic multi-section résumé comfortably under api/ai.js's
// `review` maxInput (8000) without silently dropping any section.
const PER_SECTION_CHAR_CAP = 800
// Hard safety net for a résumé with an unusual number of sections.
const OVERALL_CHAR_CAP = 7500

function truncate(text, cap) {
  return text.length > cap ? text.slice(0, cap) + '…' : text
}

/**
 * @param {Array<{ id, title, type, content, hidden? }> | null | undefined} sections
 * @returns {{ text: string, sectionTitles: Record<string, string> }}
 */
export function buildReviewPrompt(sections) {
  const visible = Array.isArray(sections) ? sections.filter(s => s && !s.hidden) : []
  const sectionTitles = {}
  const blocks = visible.map(s => {
    sectionTitles[s.id] = s.title
    const text = truncate(htmlToText(s.content), PER_SECTION_CHAR_CAP)
    return `SECTION ${s.type} (id: ${s.id}, title: "${s.title}"):\n${text}`
  })
  const combined = scrubPii(blocks.join('\n\n'))
  return { text: truncate(combined, OVERALL_CHAR_CAP), sectionTitles }
}

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

function cleanList(value) {
  if (!Array.isArray(value)) return []
  return value
    .filter(v => typeof v === 'string')
    .map(v => v.trim())
    .filter(Boolean)
}

/**
 * @param {unknown} raw - the AI `review` response (object or JSON string)
 * @param {Record<string, string>} sectionTitles - from buildReviewPrompt, to
 *   validate returned section ids and attach a display title
 * @returns {{ ok: true, bySection: Array<{ sectionId: string, sectionTitle: string, strengths: string[], issues: string[] }> } | { ok: false, error: string }}
 */
export function parseReviewResult(raw, sectionTitles) {
  const obj = coerceToObject(raw)
  if (!obj || typeof obj !== 'object' || !obj.sections || typeof obj.sections !== 'object') {
    return { ok: false, error: 'We couldn’t read the AI review. Please try again.' }
  }

  const bySection = []
  for (const [sectionId, entry] of Object.entries(obj.sections)) {
    if (!Object.hasOwn(sectionTitles, sectionId)) continue // ignore ids the model invented
    const strengths = cleanList(entry?.strengths)
    const issues = cleanList(entry?.issues)
    if (!strengths.length && !issues.length) continue
    bySection.push({ sectionId, sectionTitle: sectionTitles[sectionId], strengths, issues })
  }

  if (!bySection.length) {
    return { ok: false, error: 'The AI review didn’t return any results. Please try again.' }
  }
  return { ok: true, bySection }
}
