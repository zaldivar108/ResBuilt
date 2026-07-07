// On-device text extraction, dispatched by file kind.
//
// PRIVACY: every branch runs in the browser — the file never touches the
// network. Heavy parsers (pdf.js, mammoth) are loaded lazily so they only enter
// the bundle when a user actually imports that format. Browser-only, like
// pdfExtract; the orchestrator injects a fake for its unit tests.

import { fileKind } from './pdfImport.js'

/**
 * Extract plain text from a supported file (PDF, .docx, .txt, .md).
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function extractFileText(file) {
  const kind = fileKind(file)

  if (kind === 'text') {
    // .txt / .md — read directly. Markdown is left as-is; the AI import prompt
    // handles light markup fine.
    return file.text()
  }

  if (kind === 'pdf') {
    const { extractPdfText } = await import('./pdfExtract.js')
    return extractPdfText(file)
  }

  if (kind === 'docx') {
    const mammoth = await import('mammoth')
    const arrayBuffer = await file.arrayBuffer()
    const { value } = await mammoth.extractRawText({ arrayBuffer })
    return value
  }

  throw new Error('Unsupported file type')
}
