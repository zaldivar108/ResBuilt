import { describe, test, expect } from 'vitest'
import {
  FONTS, SIZES,
  firstFont, fontLabelFromFamily, ptFromInline, getInlinePt,
} from './toolbarUtils'

describe('firstFont', () => {
  test('returns the first family, unquoted and lowercased', () => {
    expect(firstFont('Georgia, serif')).toBe('georgia')
    expect(firstFont("'EB Garamond', Garamond, serif")).toBe('eb garamond')
    expect(firstFont('"Times New Roman", Times, serif')).toBe('times new roman')
  })

  test('handles a single family with no list', () => {
    expect(firstFont('Arial')).toBe('arial')
  })
})

describe('fontLabelFromFamily', () => {
  test('maps a known family value to its label', () => {
    expect(fontLabelFromFamily('Georgia, serif')).toBe('Georgia')
    expect(fontLabelFromFamily("'EB Garamond', Garamond, serif")).toBe('Garamond')
  })

  test('matches on the first family regardless of the fallback stack', () => {
    expect(fontLabelFromFamily('Arial, Helvetica, sans-serif')).toBe('Arial')
  })

  test('returns "Font" for an unknown or empty family', () => {
    expect(fontLabelFromFamily('Comic Sans MS')).toBe('Font')
    expect(fontLabelFromFamily('')).toBe('Font')
    expect(fontLabelFromFamily(undefined)).toBe('Font')
  })

  test('every FONTS value round-trips to its own label', () => {
    for (const f of FONTS) {
      expect(fontLabelFromFamily(f.value)).toBe(f.label)
    }
  })
})

describe('ptFromInline', () => {
  test('reads pt sizes directly', () => {
    expect(ptFromInline('12pt')).toBe(12)
    expect(ptFromInline('11.4pt')).toBe(11) // rounds
  })

  test('converts px to pt at 0.75', () => {
    expect(ptFromInline('16px')).toBe(12)
    expect(ptFromInline('12px')).toBe(9)
  })

  test('returns null for missing or non-size values', () => {
    expect(ptFromInline('')).toBeNull()
    expect(ptFromInline(null)).toBeNull()
    expect(ptFromInline('1.5em')).toBeNull()
    expect(ptFromInline('bold')).toBeNull()
  })
})

describe('getInlinePt', () => {
  function build(html) {
    const editor = document.createElement('div')
    editor.innerHTML = html
    return editor
  }

  test('finds the nearest ancestor inline font-size from a text node', () => {
    const editor = build('<span style="font-size:14pt">hello</span>')
    const textNode = editor.querySelector('span').firstChild
    expect(getInlinePt(textNode, editor)).toBe(14)
  })

  test('walks up through unsized wrappers to a sized ancestor', () => {
    const editor = build('<span style="font-size:18pt"><b><i>x</i></b></span>')
    const textNode = editor.querySelector('i').firstChild
    expect(getInlinePt(textNode, editor)).toBe(18)
  })

  test('returns null when nothing between anchor and editor is sized', () => {
    const editor = build('<p><b>plain</b></p>')
    const textNode = editor.querySelector('b').firstChild
    expect(getInlinePt(textNode, editor)).toBeNull()
  })

  test('stops at the editor root and does not read its own size', () => {
    const editor = build('<span>x</span>')
    editor.style.fontSize = '30pt'
    const textNode = editor.querySelector('span').firstChild
    expect(getInlinePt(textNode, editor)).toBeNull()
  })

  test('accepts an element anchor directly (not just a text node)', () => {
    const editor = build('<span style="font-size:10pt">x</span>')
    const span = editor.querySelector('span')
    expect(getInlinePt(span, editor)).toBe(10)
  })
})

describe('config invariants', () => {
  test('SIZES are ascending and unique', () => {
    expect([...SIZES].sort((a, b) => a - b)).toEqual(SIZES)
    expect(new Set(SIZES).size).toBe(SIZES.length)
  })

  test('FONTS labels are unique', () => {
    const labels = FONTS.map(f => f.label)
    expect(new Set(labels).size).toBe(labels.length)
  })
})
