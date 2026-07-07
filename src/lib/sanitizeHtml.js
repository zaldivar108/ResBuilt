// Sanitize HTML before it is rendered via dangerouslySetInnerHTML.
//
// Section content comes from a contentEditable (mostly trusted) but also from
// the AI proxy and imported files (NOT trusted). A model or a crafted résumé
// file can emit <script>, onerror handlers, or javascript: URLs. We allow only
// the small set of formatting tags the résumé layouts actually use.

import DOMPurify from 'dompurify'

const ALLOWED_TAGS = ['p', 'br', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'u', 's', 'span', 'a']
const ALLOWED_ATTR = ['href', 'target', 'rel', 'style']

/**
 * Return a sanitized copy of an HTML string, safe to render.
 * @param {string | null | undefined} html
 * @returns {string}
 */
export function sanitizeHtml(html) {
  if (typeof html !== 'string' || !html) return ''
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Block javascript:/data: URLs; allow normal web + mail links.
    ALLOWED_URI_REGEXP: /^(?:https?|mailto|tel):/i,
  })
}
