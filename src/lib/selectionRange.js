// Capture-and-verify a text selection inside a contentEditable, so a
// selection-level AI edit (ADR 0006) can replace exactly the fragment the
// user selected — never the whole section, never a guess at what moved.
//
// Design: offsets are plain character counts into `editorEl`'s text content,
// not live DOM Range objects. A captured range is verified by comparing
// `editorEl.innerHTML` against the snapshot taken at capture time — if it's
// byte-identical, the offsets are guaranteed still valid (the DOM tree can't
// have changed), so a fresh Range can be rebuilt safely at apply time. If the
// section id or content differs at all, the caller must refuse and ask the
// user to reselect — never guess at a corrupted range.

// Converts a boundary point (container, offset) to a plain character count
// from the start of `root`. Works whether `container` is a text node or an
// element (e.g. a selection that starts exactly at a tag boundary) — it
// delegates to the platform's own Range serialization rather than walking
// child node types itself.
function textOffsetOfPoint(root, container, offset) {
  const r = document.createRange()
  r.selectNodeContents(root)
  r.setEnd(container, offset)
  return r.toString().length
}

function textNodesOf(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes = []
  let n
  while ((n = walker.nextNode())) nodes.push(n)
  return nodes
}

// Inverse of textOffsetOfPoint: finds the (text node, local offset) pair at
// a given character count. Always lands on a real text node, so range
// boundaries built from it are unambiguous.
function pointAtTextOffset(root, targetOffset) {
  let offset = 0
  const nodes = textNodesOf(root)
  for (const node of nodes) {
    const len = node.textContent.length
    if (targetOffset <= offset + len) return { node, offset: targetOffset - offset }
    offset += len
  }
  const last = nodes[nodes.length - 1]
  return last ? { node: last, offset: last.textContent.length } : null
}

/**
 * Capture the current selection inside `editorEl`, if any, non-empty, and
 * contained within it.
 * @param {HTMLElement} editorEl
 * @param {string} sectionId
 * @returns {{ sectionId: string, contentSnapshot: string, startOffset: number, endOffset: number, text: string } | null}
 */
export function captureSelectionRange(editorEl, sectionId) {
  if (!editorEl) return null
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount || sel.isCollapsed) return null
  const range = sel.getRangeAt(0)
  if (!editorEl.contains(range.commonAncestorContainer)) return null

  const text = range.toString().trim()
  if (!text) return null

  const startOffset = textOffsetOfPoint(editorEl, range.startContainer, range.startOffset)
  const endOffset = textOffsetOfPoint(editorEl, range.endContainer, range.endOffset)
  return { sectionId, contentSnapshot: editorEl.innerHTML, startOffset, endOffset, text }
}

/**
 * True when a captured range is no longer safe to apply — the active
 * section changed, or the editor's content changed at all since capture.
 * @param {ReturnType<typeof captureSelectionRange>} captured
 * @param {HTMLElement} editorEl
 * @param {string} sectionId
 * @returns {boolean}
 */
export function isSelectionRangeStale(captured, editorEl, sectionId) {
  if (!captured || !editorEl) return true
  if (captured.sectionId !== sectionId) return true
  return editorEl.innerHTML !== captured.contentSnapshot
}

/**
 * Replace exactly the captured range with `replacementHtml`. Caller must
 * have already verified `!isSelectionRangeStale(...)` — this does not
 * re-check staleness, it only rebuilds the Range from the (already-safe)
 * offsets and performs the DOM swap.
 * @param {HTMLElement} editorEl
 * @param {{ startOffset: number, endOffset: number }} captured
 * @param {string} replacementHtml
 * @returns {boolean} true if the replacement was performed
 */
export function replaceSelectionRange(editorEl, captured, replacementHtml) {
  const start = pointAtTextOffset(editorEl, captured.startOffset)
  const end = pointAtTextOffset(editorEl, captured.endOffset)
  if (!start || !end) return false

  const range = document.createRange()
  range.setStart(start.node, start.offset)
  range.setEnd(end.node, end.offset)
  range.deleteContents()

  const template = document.createElement('template')
  template.innerHTML = replacementHtml
  range.insertNode(template.content)
  editorEl.normalize()
  return true
}
