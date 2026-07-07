// Redact obvious PII before sending text to the AI for context-only tasks
// (e.g. "Suggest ideas", which needs the gist, not your email or phone).
//
// NOT used for Improve/Grammar — those rewrite your actual text and must see it
// verbatim. Best-effort defense-in-depth for a tool used by minors; pure and
// testable. Order matters: URLs before emails so mailto-ish tails don't collide.

const URL_RE = /\bhttps?:\/\/\S+/gi
const EMAIL_RE = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/gi
// Optional country code, then 3-3-4 with common separators/parens.
const PHONE_RE = /(?:\+?\d{1,2}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g

/**
 * @param {string | null | undefined} text
 * @returns {string}
 */
export function scrubPii(text) {
  if (typeof text !== 'string' || !text) return ''
  return text
    .replace(URL_RE, '[link]')
    .replace(EMAIL_RE, '[email]')
    .replace(PHONE_RE, '[phone]')
}
