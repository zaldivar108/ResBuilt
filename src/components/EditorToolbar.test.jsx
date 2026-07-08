import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import EditorToolbar from './EditorToolbar'
import { AiProvider } from './ui/AiInput'

// jsdom doesn't implement execCommand/queryCommand* (rich-text editing is out
// of its scope) — EditorToolbar's format-state resolver calls these on every
// selectionchange. Stub them so driving selectionchange in these tests
// doesn't throw; the format-button state itself isn't what's under test here.
beforeEach(() => {
  document.queryCommandValue = () => ''
  document.queryCommandState = () => false
  document.execCommand = () => true
})

const AI_LABEL_OFF = /select some text to improve it with ai/i
const AI_LABEL_ON = /improve this selection/i

function renderToolbar(section = { id: 'sec1', title: 'Experience', type: 'experience', content: '<p>Helped customers today</p>' }) {
  const editorEl = document.createElement('div')
  editorEl.innerHTML = section.content
  document.body.appendChild(editorEl)
  const editorRef = { current: editorEl }

  render(
    <AiProvider section={section}>
      <EditorToolbar editorRef={editorRef} fontFamily="Arial, sans-serif" fontSize={12} />
    </AiProvider>
  )
  return editorEl
}

function selectText(editorEl, text) {
  const textNode = editorEl.querySelector('p').firstChild
  const start = textNode.textContent.indexOf(text)
  const range = document.createRange()
  range.setStart(textNode, start)
  range.setEnd(textNode, start + text.length)
  const sel = window.getSelection()
  sel.removeAllRanges()
  sel.addRange(range)
  fireEvent(document, new Event('selectionchange'))
}

function collapseSelection(editorEl) {
  const textNode = editorEl.querySelector('p').firstChild
  const range = document.createRange()
  range.setStart(textNode, 0)
  range.setEnd(textNode, 0)
  const sel = window.getSelection()
  sel.removeAllRanges()
  sel.addRange(range)
  fireEvent(document, new Event('selectionchange'))
}

afterEach(() => {
  document.body.innerHTML = ''
  window.getSelection()?.removeAllRanges()
})

describe('EditorToolbar — selection-level AI button (ADR 0006)', () => {
  test('is disabled when there is no selection', () => {
    renderToolbar()
    const btn = screen.getByRole('button', { name: AI_LABEL_OFF })
    expect(btn).toBeDisabled()
  })

  test('is enabled once a non-empty selection exists inside the editor', () => {
    const editorEl = renderToolbar()
    selectText(editorEl, 'customers')
    const btn = screen.getByRole('button', { name: AI_LABEL_ON })
    expect(btn).not.toBeDisabled()
  })

  test('is disabled again once the selection collapses', () => {
    const editorEl = renderToolbar()
    selectText(editorEl, 'customers')
    expect(screen.getByRole('button', { name: AI_LABEL_ON })).not.toBeDisabled()

    collapseSelection(editorEl)
    expect(screen.getByRole('button', { name: AI_LABEL_OFF })).toBeDisabled()
  })

  test('has an aria-label describing its state, like the other toolbar buttons', () => {
    renderToolbar()
    const btn = screen.getByRole('button', { name: AI_LABEL_OFF })
    expect(btn).toHaveAttribute('aria-label')
  })
})
