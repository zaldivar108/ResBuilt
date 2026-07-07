// Client-side guards for the "Import from PDF" flow.
//
// Privacy note: extraction happens in the browser (the file never leaves the
// device); only the extracted plaintext is later sent to the AI proxy after an
// explicit consent gate. These are pure functions — no pdf.js, no network — so
// the rules stay easy to test and reason about.

/** Hard upload cap. Text-only résumés are tiny; 5 MB is generous. */
export const MAX_PDF_BYTES = 5 * 1024 * 1024

/** Below this many characters we assume a scanned/image PDF (no OCR). */
export const MIN_TEXT_CHARS = 100

/** Cap the text sent to the AI so one Groq call stays cheap and bounded. */
export const MAX_TEXT_CHARS = 15000

function looksLikePdf(file) {
  if (file.type === 'application/pdf') return true
  // Some browsers report an empty/odd mime type for local files — fall back
  // to the extension.
  return typeof file.name === 'string' && /\.pdf$/i.test(file.name.trim())
}

/**
 * Validate a chosen file before extraction.
 * @param {{ name?: string, type?: string, size?: number } | null | undefined} file
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function validatePdfFile(file) {
  if (!file) return { ok: false, error: 'Please choose a PDF file to import.' }
  if (!looksLikePdf(file)) {
    return { ok: false, error: 'That file isn’t a PDF. Please choose a .pdf file.' }
  }
  if (typeof file.size === 'number' && file.size > MAX_PDF_BYTES) {
    return { ok: false, error: 'That PDF is too large (max 5 MB).' }
  }
  return { ok: true }
}

/**
 * Assess text pulled out of the PDF, then cap it for the AI call.
 * @param {string | null | undefined} text
 * @returns {{ ok: true, text: string } | { ok: false, error: string }}
 */
export function assessExtractedText(text) {
  const value = typeof text === 'string' ? text : ''
  if (value.trim().length < MIN_TEXT_CHARS) {
    return {
      ok: false,
      error:
        'We couldn’t read enough text from that PDF. It may be a scanned or image-based file, which isn’t supported yet.',
    }
  }
  return { ok: true, text: value.slice(0, MAX_TEXT_CHARS) }
}
