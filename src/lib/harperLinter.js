// Lazy singleton for the harper.js WASM grammar linter.
//
// PRIVACY: harper runs entirely in the browser via WebAssembly — grammar
// checking never touches the network. The WASM binary is ~big, so we load it
// only the first time the user runs "Fix grammar", then reuse the instance.
// Browser-only (like pdfExtract) — the grammar logic in grammarFix.js is tested
// with a fake linter instead.

let linterPromise = null

async function createLinter() {
  const harper = await import('harper.js')
  const { binary } = await import('harper.js/binary')
  const linter = new harper.LocalLinter({ binary, dialect: harper.Dialect.American })
  await linter.setup()
  return linter
}

/**
 * Get the shared harper linter, creating it on first use.
 * @returns {Promise<object>} a harper.js Linter (lint / applySuggestion / setup)
 */
export function getLinter() {
  if (!linterPromise) linterPromise = createLinter()
  return linterPromise
}
