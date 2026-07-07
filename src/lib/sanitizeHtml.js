// Sanitize HTML before it is rendered via dangerouslySetInnerHTML.
//
// Section content comes from a contentEditable (mostly trusted) but also from
// the AI proxy and imported files (NOT trusted). A model or a crafted résumé
// file can emit <script>, onerror handlers, or javascript: URLs. We allow only
// the small set of formatting tags the résumé layouts actually use.

import DOMPurify from 'dompurify'

const ALLOWED_TAGS = ['p', 'br', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'u', 's', 'span', 'a']
// `style` is intentionally NOT allowed: none of the AI prompts emit it, and an
// inline style could smuggle a CSS beacon (background:url(...)) — a tracking
// vector we won't accept in a privacy-first tool used by minors. Formatting is
// carried by the tags above, not inline styles.
const ALLOWED_ATTR = ['href', 'target', 'rel']

// Force safe rel on any link that opens a new tab, so a sanitized <a target="_blank">
// can't reach window.opener. Registered once at module load.
let hookInstalled = false
function installHook() {
  if (hookInstalled) return
  DOMPurify.addHook('afterSanitizeAttributes', node => {
    if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
      node.setAttribute('rel', 'noopener noreferrer')
    }
  })
  hookInstalled = true
}

/**
 * Return a sanitized copy of an HTML string, safe to render.
 * @param {string | null | undefined} html
 * @returns {string}
 */
export function sanitizeHtml(html) {
  if (typeof html !== 'string' || !html) return ''
  installHook()
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Block javascript:/data: URLs; allow normal web + mail links.
    ALLOWED_URI_REGEXP: /^(?:https?|mailto|tel):/i,
  })
}
