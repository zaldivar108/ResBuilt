// On-device PDF text extraction with pdf.js.
//
// PRIVACY: the file is read into an ArrayBuffer and parsed entirely in the
// browser — it never touches the network. Only the resulting plaintext is later
// sent (with explicit consent) to the AI proxy. This module is a thin wrapper
// around pdf.js and is exercised through the browser, not unit tests (the
// orchestrator injects a fake extractor for its tests).

// pdf.js is ~1 MB — load it lazily so it only enters the bundle when a user
// actually imports a PDF, not on every dashboard visit.
async function loadPdfjs() {
  const pdfjs = await import('pdfjs-dist')
  // Vite resolves this to a hashed asset URL; the worker runs off the main thread.
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
  return pdfjs
}

/**
 * Extract concatenated plain text from every page of a PDF file.
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function extractPdfText(file) {
  const pdfjs = await loadPdfjs()
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: buffer }).promise
  const pages = []
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const content = await page.getTextContent()
    const text = content.items.map(item => ('str' in item ? item.str : '')).join(' ')
    pages.push(text)
  }
  return pages.join('\n\n')
}
