// Deterministic, on-device formatter for the CONTACT section.
//
// Privacy (audience is minors): a contact section holds the person's name,
// email, and phone — exactly the PII we don't want to send to a third-party
// LLM. So "Format" on a contact section runs here, locally, instead of hitting
// Groq. The rules mirror FORMAT_HINTS.contact in api/ai.js, but no data leaves
// the browser. Pure and testable.

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Split contact HTML into trimmed, non-empty text lines. Block tags become line
// breaks; remaining tags are stripped; entities are decoded.
function toLines(html) {
  const withBreaks = String(html ?? '')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
  const text = withBreaks
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
  return text
    .split('\n')
    .flatMap(line => line.split(/[|•·]/)) // people cram fields onto one line
    .map(l => l.trim())
    .filter(Boolean)
}

const EMAIL_RE = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/
const URL_RE = /\b(?:https?:\/\/|www\.)\S+|\b(?:linkedin|github|gitlab|behance|dribbble)\.\S+/i
const PHONE_RE = /(?:\+?\d[\d\s().-]{7,}\d)/

/**
 * Normalize a phone string. US 10-digit → "(555) 123-4567"; 11-digit leading 1
 * → "+1 (555) 123-4567"; anything else is returned trimmed, unchanged.
 * @param {string} raw
 * @returns {string}
 */
export function normalizePhone(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '')
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    const d = digits.slice(1)
    return `+1 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
  }
  return String(raw ?? '').trim()
}

/**
 * Format a contact section into the conventional layout, entirely on-device.
 * Order: name (bold) · email · phone · location · links. Nothing is invented;
 * unrecognized lines are preserved as location/extra lines.
 * @param {string} html - the contact section's current HTML
 * @returns {string} formatted HTML (still run through sanitizeHtml by the caller)
 */
export function formatContactLocal(html) {
  const lines = toLines(html)
  if (!lines.length) return String(html ?? '')

  let name = ''
  let email = ''
  let phone = ''
  const links = []
  const other = []

  for (const line of lines) {
    if (!email && EMAIL_RE.test(line)) { email = line.match(EMAIL_RE)[0]; continue }
    if (URL_RE.test(line)) { links.push(line); continue }
    if (!phone && PHONE_RE.test(line) && (line.match(/\d/g) || []).length >= 7) {
      phone = normalizePhone(line.match(PHONE_RE)[0]); continue
    }
    if (!name) { name = line; continue } // first plain line is the name
    other.push(line)
  }

  const parts = []
  if (name) parts.push(`<p><strong>${escapeHtml(name)}</strong></p>`)
  if (email) parts.push(`<p>${escapeHtml(email)}</p>`)
  if (phone) parts.push(`<p>${escapeHtml(phone)}</p>`)
  for (const o of other) parts.push(`<p>${escapeHtml(o)}</p>`)
  for (const l of links) parts.push(`<p>${escapeHtml(l)}</p>`)
  return parts.join('')
}
