// Word-level diff between a section's current content and an AI result, for
// the apply-preview (ADR 0003). Diffs the TEXT layer (DOM-extracted), never
// raw HTML — diffing markup produces tag-noise on every formatting change.
// `diff` (jsdiff) is dynamically imported so it never inflates the main
// bundle; it only loads the first time a diff is actually shown.

import { htmlToText } from './resumeChecklist'

let diffWordsPromise = null
function loadDiffWords() {
  if (!diffWordsPromise) diffWordsPromise = import('diff').then(mod => mod.diffWords)
  return diffWordsPromise
}

/**
 * @param {string | null | undefined} beforeHtml
 * @param {string | null | undefined} afterHtml
 * @returns {Promise<Array<{ value: string, added?: boolean, removed?: boolean }>>}
 */
export async function diffSectionText(beforeHtml, afterHtml) {
  const diffWords = await loadDiffWords()
  return diffWords(htmlToText(beforeHtml), htmlToText(afterHtml))
}
