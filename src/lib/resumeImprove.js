// Client-side plumbing for the AI whole-résumé `improveAll` task: rewrites
// every eligible section's actual content in one call — writing, not just
// commenting like resumeReview.js. Reuses single-section Improve's privacy
// model (full text sent verbatim; see scrubPii.js's own note on why
// Improve/Grammar skip redaction) rather than review's PII-scrubbed analysis
// pass. The contact section is excluded entirely: it's data, not wording, and
// carries the résumé's most concentrated PII. Pure and testable — no fetch
// here (the caller owns the network call, same split as tailor.js/resumeReview.js).

const PER_SECTION_CHAR_CAP = 1200
const OVERALL_CHAR_CAP = 7000

function truncate(text, cap) {
  return text.length > cap ? text.slice(0, cap) + '…' : text
}

/**
 * @param {Array<{ id, title, type, content, hidden? }> | null | undefined} sections
 * @returns {{ text: string, sectionTitles: Record<string, string> }}
 */
export function buildImproveAllPrompt(sections) {
  const visible = Array.isArray(sections)
    ? sections.filter(s => s && !s.hidden && s.type !== 'contact')
    : []
  const sectionTitles = {}
  const blocks = visible.map(s => {
    sectionTitles[s.id] = s.title
    const html = truncate(typeof s.content === 'string' ? s.content : '', PER_SECTION_CHAR_CAP)
    return `SECTION ${s.type} (id: ${s.id}, title: "${s.title}"):\n${html}`
  })
  const combined = blocks.join('\n\n')
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

/**
 * @param {unknown} raw - the AI `improveAll` response (object or JSON string)
 * @param {Record<string, string>} sectionTitles - from buildImproveAllPrompt, to
 *   validate returned section ids and attach a display title
 * @returns {{ ok: true, bySection: Array<{ sectionId: string, sectionTitle: string, html: string }> } | { ok: false, error: string }}
 */
export function parseImproveAllResult(raw, sectionTitles) {
  const obj = coerceToObject(raw)
  if (!obj || typeof obj !== 'object' || !obj.sections || typeof obj.sections !== 'object') {
    return { ok: false, error: 'We couldn’t read the AI’s changes. Please try again.' }
  }

  const bySection = []
  for (const [sectionId, html] of Object.entries(obj.sections)) {
    if (!Object.hasOwn(sectionTitles, sectionId)) continue // ignore ids the model invented
    if (typeof html !== 'string' || !html.trim()) continue
    bySection.push({ sectionId, sectionTitle: sectionTitles[sectionId], html: html.trim() })
  }

  if (!bySection.length) {
    return { ok: false, error: 'The AI didn’t return any changes. Please try again.' }
  }
  return { ok: true, bySection }
}
