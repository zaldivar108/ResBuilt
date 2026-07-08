// Pure helpers + config for EditorToolbar. Extracted so the fragile font-size /
// font-family resolution logic can be unit-tested without a live contentEditable.

export const FONTS = [
  { label: 'Arial',           value: 'Arial, sans-serif' },
  { label: 'Georgia',         value: 'Georgia, serif' },
  { label: 'Garamond',        value: "'EB Garamond', Garamond, serif" },
  { label: 'Helvetica',       value: "'Helvetica Neue', Helvetica, sans-serif" },
  { label: 'Times New Roman', value: "'Times New Roman', Times, serif" },
  { label: 'Verdana',         value: 'Verdana, sans-serif' },
  { label: 'Calibri',         value: "'Calibri', Candara, sans-serif" },
]

export const SIZES = [8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 28]

// First family in a CSS font-family list, lowercased and unquoted.
export function firstFont(str) {
  return str.split(',')[0].trim().replace(/['"]/g, '').toLowerCase()
}

// Map a CSS font-family value back to a known FONTS label. 'Font' when unknown.
export function fontLabelFromFamily(family) {
  if (!family) return 'Font'
  const match = FONTS.find(f => firstFont(f.value) === firstFont(family))
  return match ? match.label : 'Font'
}

// Parse an inline font-size string to whole points (px → pt at 0.75). null if not sizable.
export function ptFromInline(str) {
  if (!str) return null
  if (str.endsWith('pt')) return Math.round(parseFloat(str))
  if (str.endsWith('px')) return Math.round(parseFloat(str) * 0.75)
  return null
}

// Walk up from the selection anchor to the editor root, returning the first
// inline font-size (in pt) found. null if none along the chain.
export function getInlinePt(anchorNode, editorEl) {
  let el = anchorNode?.nodeType === Node.TEXT_NODE ? anchorNode.parentElement : anchorNode
  while (el && el !== editorEl) {
    const pt = ptFromInline(el.style?.fontSize)
    if (pt) return pt
    el = el.parentElement
  }
  return null
}
