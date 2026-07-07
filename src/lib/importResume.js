// Orchestrates the résumé "Import" flow: validate → extract (on-device) →
// assess → one AI call → normalize into resume sections. Handles PDF, Word
// (.docx), .txt, and .md.
//
// The pieces it depends on (text extraction, the AI network call) are injected
// so this coordinator is fully unit-testable without pdf.js/mammoth or a
// server. The defaults wire in the real implementations.

import { validateImportFile, assessExtractedText, SUPPORTED_IMPORT_EXTENSIONS } from './pdfImport.js'
import { normalizeImportedSections } from './importSections.js'
import { extractFileText } from './fileExtract.js'
import { sanitizeHtml } from './sanitizeHtml.js'

const EXT_RE = new RegExp(`\\.(${SUPPORTED_IMPORT_EXTENSIONS.join('|')})$`, 'i')

/** Derive a resume title from the uploaded filename. */
export function titleFromFilename(name) {
  const base = typeof name === 'string' ? name.replace(EXT_RE, '').trim() : ''
  return base || 'Imported Resume'
}

// Default AI call: POST the extracted text to the Edge proxy's `import` task.
// Returns { ok, result } | { ok:false, error } — the same envelope the UI uses.
async function defaultCallImport(text) {
  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'import', text }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { ok: false, error: data.error || 'The AI could not process your résumé. Try again.' }
    }
    return { ok: true, result: data.result || '' }
  } catch {
    return { ok: false, error: 'Could not reach the AI. If running locally, use `vercel dev`.' }
  }
}

/**
 * @param {File | {name,type,size}} file
 * @param {{ extractText?: (file) => Promise<string>, callImport?: (text) => Promise<{ok,result?,error?}> }} [deps]
 * @returns {Promise<{ ok: true, title: string, sections: Array } | { ok: false, error: string }>}
 */
export async function importResumeFromFile(file, deps = {}) {
  const extractText = deps.extractText ?? extractFileText
  const callImport = deps.callImport ?? defaultCallImport

  const fileCheck = validateImportFile(file)
  if (!fileCheck.ok) return fileCheck

  let rawText
  try {
    rawText = await extractText(file)
  } catch {
    return { ok: false, error: 'We couldn’t read that file. It may be corrupted or password-protected.' }
  }

  const textCheck = assessExtractedText(rawText)
  if (!textCheck.ok) return textCheck

  const ai = await callImport(textCheck.text)
  if (!ai.ok) return { ok: false, error: ai.error }

  const normalized = normalizeImportedSections(ai.result)
  if (!normalized.ok) return normalized

  // AI/file content is untrusted — sanitize before it becomes section HTML.
  const sections = normalized.sections.map(s => ({ ...s, content: sanitizeHtml(s.content) }))
  return { ok: true, title: titleFromFilename(file.name), sections }
}
