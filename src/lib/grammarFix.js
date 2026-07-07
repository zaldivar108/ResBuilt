// On-device grammar/spelling correction for a résumé section.
//
// harper.js lints PLAIN TEXT, but section content is HTML (<p>, <ul>, <li>,
// <strong>, <em>). We walk the text nodes only, correct each in place, and
// re-serialize — the tags are never touched. The linter is injected so this
// logic is unit-testable with a fake; the real WASM linter comes from
// harperLinter.js and only loads in the browser.

// Safety cap on re-lint passes so a stubborn/no-op suggestion can't spin forever.
const MAX_PASSES = 25

// The docs show suggestions as either a method or an array depending on version
// — read it defensively.
function getSuggestions(lint) {
  const s = typeof lint.suggestions === 'function' ? lint.suggestions() : lint.suggestions
  return Array.isArray(s) ? s : []
}

/**
 * Correct a plain-text string by repeatedly linting and applying the first
 * suggestion. Re-linting each pass keeps span offsets valid after edits.
 * @param {string} text
 * @param {{ lint: (t: string) => Promise<any[]>, applySuggestion: (t, lint, s) => Promise<string> }} linter
 * @returns {Promise<string>}
 */
export async function correctText(text, linter) {
  if (typeof text !== 'string' || !text.trim()) return text ?? ''

  let out = text
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const lints = await linter.lint(out)
    const fixable = lints.find(l => getSuggestions(l).length > 0)
    if (!fixable) break

    const next = await linter.applySuggestion(out, fixable, getSuggestions(fixable)[0])
    if (next === out) break // suggestion changed nothing — stop rather than loop
    out = next
  }
  return out
}

/**
 * Correct grammar/spelling inside HTML, preserving all tags.
 * @param {string} html
 * @param {object} linter - a harper.js-shaped linter (see correctText)
 * @returns {Promise<string>}
 */
export async function fixGrammarInHtml(html, linter) {
  if (typeof html !== 'string' || !html.trim()) return html ?? ''

  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT)

  const textNodes = []
  let node = walker.nextNode()
  while (node) {
    if (node.textContent && node.textContent.trim()) textNodes.push(node)
    node = walker.nextNode()
  }

  for (const textNode of textNodes) {
    textNode.textContent = await correctText(textNode.textContent, linter)
  }

  return doc.body.innerHTML
}
