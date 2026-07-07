// Client-side guards for the résumé "Import" flow (PDF, Word .docx, .txt, .md).
//
// Privacy note: extraction happens in the browser (the file never leaves the
// device); only the extracted plaintext is later sent to the AI proxy after an
// explicit consent gate. These are pure functions — no pdf.js/mammoth, no
// network — so the rules stay easy to test and reason about.

/** Hard upload cap. Text-only résumés are tiny; 5 MB is generous. */
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024
/** @deprecated kept for callers; same value as MAX_IMPORT_BYTES. */
export const MAX_PDF_BYTES = MAX_IMPORT_BYTES

/** Below this many characters we assume an unreadable file (e.g. scanned PDF). */
export const MIN_TEXT_CHARS = 100

/** Cap the text sent to the AI so one Groq call stays cheap and bounded. */
export const MAX_TEXT_CHARS = 15000

/** Extensions we can extract in-browser. */
export const SUPPORTED_IMPORT_EXTENSIONS = ['pdf', 'docx', 'txt', 'md']

function extensionOf(file) {
  const name = typeof file?.name === 'string' ? file.name.trim().toLowerCase() : ''
  const dot = name.lastIndexOf('.')
  return dot >= 0 ? name.slice(dot + 1) : ''
}

/**
 * Classify a file into an extractor "kind": 'pdf' | 'docx' | 'text', or null if
 * unsupported. Uses extension first, MIME type as a fallback.
 * @param {{ name?: string, type?: string }} file
 * @returns {'pdf' | 'docx' | 'text' | null}
 */
export function fileKind(file) {
  if (!file) return null
  const ext = extensionOf(file)
  const type = file.type || ''
  if (ext === 'pdf' || type === 'application/pdf') return 'pdf'
  if (
    ext === 'docx' ||
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'docx'
  }
  if (ext === 'txt' || ext === 'md' || type === 'text/plain' || type === 'text/markdown') {
    return 'text'
  }
  return null
}

/**
 * Validate a chosen file before extraction.
 * @param {{ name?: string, type?: string, size?: number } | null | undefined} file
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function validateImportFile(file) {
  if (!file) return { ok: false, error: 'Please choose a file to import.' }

  if (!fileKind(file)) {
    // Legacy binary .doc has no reliable in-browser extractor — point users to a
    // supported format instead of failing cryptically.
    if (extensionOf(file) === 'doc') {
      return { ok: false, error: 'Old .doc files aren’t supported — save it as .docx or PDF and try again.' }
    }
    return { ok: false, error: 'Unsupported file. Import a PDF, Word (.docx), .txt, or .md file.' }
  }
  if (typeof file.size === 'number' && file.size > MAX_IMPORT_BYTES) {
    return { ok: false, error: 'That file is too large (max 5 MB).' }
  }
  return { ok: true }
}

/**
 * Assess extracted text, then cap it for the AI call.
 * @param {string | null | undefined} text
 * @returns {{ ok: true, text: string } | { ok: false, error: string }}
 */
export function assessExtractedText(text) {
  const value = typeof text === 'string' ? text : ''
  if (value.trim().length < MIN_TEXT_CHARS) {
    return {
      ok: false,
      error:
        'We couldn’t read enough text from that file. If it’s a scanned or image-only PDF, that isn’t supported yet.',
    }
  }
  return { ok: true, text: value.slice(0, MAX_TEXT_CHARS) }
}
