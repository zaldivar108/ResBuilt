import { describe, test, expect, afterEach } from 'vitest'
import { captureSelectionRange, isSelectionRangeStale, replaceSelectionRange } from './selectionRange.js'

function makeEditor(html) {
  const el = document.createElement('div')
  el.innerHTML = html
  document.body.appendChild(el)
  return el
}

// Stub window.getSelection() to wrap a real jsdom Range — decouples these
// tests from jsdom's own (partial) Selection implementation.
function stubSelection(range) {
  const original = window.getSelection
  window.getSelection = () => ({
    rangeCount: 1,
    isCollapsed: range.collapsed,
    getRangeAt: () => range,
    toString: () => range.toString(),
  })
  return () => { window.getSelection = original }
}

function selectText(el, text) {
  const textNode = el.querySelector('p, li').firstChild
  const start = textNode.textContent.indexOf(text)
  const range = document.createRange()
  range.setStart(textNode, start)
  range.setEnd(textNode, start + text.length)
  return range
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('captureSelectionRange', () => {
  test('captures the selected text, offsets, and a content snapshot', () => {
    const el = makeEditor('<p>Helped customers at the counter</p>')
    const range = selectText(el, 'customers')
    const restore = stubSelection(range)
    try {
      const captured = captureSelectionRange(el, 'sec1')
      expect(captured).toEqual({
        sectionId: 'sec1',
        contentSnapshot: el.innerHTML,
        startOffset: 'Helped '.length,
        endOffset: 'Helped customers'.length,
        text: 'customers',
      })
    } finally {
      restore()
    }
  })

  test('returns null when the selection is collapsed (nothing selected)', () => {
    const el = makeEditor('<p>Helped customers</p>')
    const textNode = el.querySelector('p').firstChild
    const range = document.createRange()
    range.setStart(textNode, 0)
    range.setEnd(textNode, 0)
    const restore = stubSelection(range)
    try {
      expect(captureSelectionRange(el, 'sec1')).toBeNull()
    } finally {
      restore()
    }
  })

  test('returns null when the selection is outside the editor', () => {
    const el = makeEditor('<p>Helped customers</p>')
    const outside = document.createElement('div')
    outside.textContent = 'Some other text'
    document.body.appendChild(outside)
    const range = document.createRange()
    range.setStart(outside.firstChild, 0)
    range.setEnd(outside.firstChild, 4)
    const restore = stubSelection(range)
    try {
      expect(captureSelectionRange(el, 'sec1')).toBeNull()
    } finally {
      restore()
    }
  })

  test('returns null when there is no selection at all', () => {
    const el = makeEditor('<p>Helped customers</p>')
    const restore = stubSelection({ collapsed: true, toString: () => '' })
    window.getSelection = () => ({ rangeCount: 0 })
    try {
      expect(captureSelectionRange(el, 'sec1')).toBeNull()
    } finally {
      restore()
    }
  })

  test('returns null for a whitespace-only selection', () => {
    const el = makeEditor('<p>Helped   customers</p>')
    const textNode = el.querySelector('p').firstChild
    const range = document.createRange()
    range.setStart(textNode, 'Helped'.length)
    range.setEnd(textNode, 'Helped   '.length)
    const restore = stubSelection(range)
    try {
      expect(captureSelectionRange(el, 'sec1')).toBeNull()
    } finally {
      restore()
    }
  })
})

describe('isSelectionRangeStale', () => {
  test('is not stale when section and content are unchanged', () => {
    const el = makeEditor('<p>Helped customers</p>')
    const captured = { sectionId: 'sec1', contentSnapshot: el.innerHTML, startOffset: 0, endOffset: 6, text: 'Helped' }
    expect(isSelectionRangeStale(captured, el, 'sec1')).toBe(false)
  })

  test('is stale when the active section changed', () => {
    const el = makeEditor('<p>Helped customers</p>')
    const captured = { sectionId: 'sec1', contentSnapshot: el.innerHTML, startOffset: 0, endOffset: 6, text: 'Helped' }
    expect(isSelectionRangeStale(captured, el, 'sec2')).toBe(true)
  })

  test('is stale when the section content changed', () => {
    const el = makeEditor('<p>Helped customers</p>')
    const captured = { sectionId: 'sec1', contentSnapshot: el.innerHTML, startOffset: 0, endOffset: 6, text: 'Helped' }
    el.innerHTML = '<p>Different content now</p>'
    expect(isSelectionRangeStale(captured, el, 'sec1')).toBe(true)
  })

  test('is stale when there is nothing captured', () => {
    const el = makeEditor('<p>Helped customers</p>')
    expect(isSelectionRangeStale(null, el, 'sec1')).toBe(true)
  })
})

describe('replaceSelectionRange', () => {
  test('replaces exactly the captured range with the replacement text', () => {
    const el = makeEditor('<p>Helped customers at the counter</p>')
    const captured = {
      sectionId: 'sec1',
      contentSnapshot: el.innerHTML,
      startOffset: 'Helped '.length,
      endOffset: 'Helped customers'.length,
      text: 'customers',
    }
    const ok = replaceSelectionRange(el, captured, 'clients')
    expect(ok).toBe(true)
    expect(el.textContent).toBe('Helped clients at the counter')
  })

  test('preserves surrounding markup outside the replaced range', () => {
    const el = makeEditor('<ul><li>Helped customers daily</li></ul>')
    const captured = {
      sectionId: 'sec1',
      contentSnapshot: el.innerHTML,
      startOffset: 'Helped '.length,
      endOffset: 'Helped customers'.length,
      text: 'customers',
    }
    replaceSelectionRange(el, captured, 'clients')
    expect(el.querySelector('li')).not.toBeNull()
    expect(el.textContent).toBe('Helped clients daily')
  })
})
