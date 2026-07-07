import { describe, test, expect } from 'vitest'
import { correctText, fixGrammarInHtml } from './grammarFix.js'

// A fake harper linter: models the re-lint loop. Each lint() reports any known
// misspelling still present; applySuggestion() swaps the first occurrence. This
// mirrors the real Linter's shape (lint → suggestions → applySuggestion)
// without loading WASM.
function fakeLinter(fixes = { recieve: 'receive', alot: 'a lot' }) {
  return {
    async lint(text) {
      return Object.entries(fixes)
        .filter(([wrong]) => text.includes(wrong))
        .map(([wrong, right]) => ({
          wrong,
          suggestions: () => [{ get_replacement_text: () => right }],
        }))
    },
    async applySuggestion(text, lint, suggestion) {
      return text.replace(lint.wrong, suggestion.get_replacement_text())
    },
  }
}

// A linter whose "fix" never changes the text — must not loop forever.
function noOpLinter() {
  return {
    async lint(text) {
      return text.includes('x')
        ? [{ suggestions: () => [{ get_replacement_text: () => text }] }]
        : []
    },
    async applySuggestion(text) {
      return text // no change
    },
  }
}

describe('correctText', () => {
  test('fixes every error across multiple passes', async () => {
    const out = await correctText('I recieve alot of mail', fakeLinter())
    expect(out).toBe('I receive a lot of mail')
  })

  test('returns clean text unchanged', async () => {
    const out = await correctText('This sentence is fine.', fakeLinter())
    expect(out).toBe('This sentence is fine.')
  })

  test('leaves empty / whitespace text alone without calling the linter', async () => {
    expect(await correctText('', fakeLinter())).toBe('')
    expect(await correctText('   \n', fakeLinter())).toBe('   \n')
  })

  test('terminates even when a suggestion does not change the text', async () => {
    const out = await correctText('x marks the spot', noOpLinter())
    expect(out).toBe('x marks the spot')
  })
})

describe('fixGrammarInHtml', () => {
  test('corrects text while preserving the tag structure', async () => {
    const html = '<p>I recieve mail</p>'
    const out = await fixGrammarInHtml(html, fakeLinter())
    expect(out).toBe('<p>I receive mail</p>')
  })

  test('corrects text inside nested tags without touching the tags', async () => {
    const html = '<ul><li>I <strong>recieve</strong> alot</li></ul>'
    const out = await fixGrammarInHtml(html, fakeLinter())
    expect(out).toContain('<strong>receive</strong>')
    expect(out).toContain('a lot')
    expect(out).toContain('<li>')
  })

  test('leaves clean HTML unchanged', async () => {
    const html = '<p>All good here.</p>'
    expect(await fixGrammarInHtml(html, fakeLinter())).toBe('<p>All good here.</p>')
  })

  test('handles empty content', async () => {
    expect(await fixGrammarInHtml('', fakeLinter())).toBe('')
  })
})
