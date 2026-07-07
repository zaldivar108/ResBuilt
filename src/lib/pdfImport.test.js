import { describe, test, expect } from 'vitest'
import {
  MAX_PDF_BYTES,
  MIN_TEXT_CHARS,
  MAX_TEXT_CHARS,
  validatePdfFile,
  assessExtractedText,
} from './pdfImport.js'

// Minimal stand-in for a File — we only touch name/type/size.
function fakeFile({ name = 'resume.pdf', type = 'application/pdf', size = 1000 } = {}) {
  return { name, type, size }
}

describe('validatePdfFile', () => {
  test('accepts a normal .pdf under the size cap', () => {
    const result = validatePdfFile(fakeFile())
    expect(result.ok).toBe(true)
  })

  test('rejects when no file is provided', () => {
    const result = validatePdfFile(null)
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/choose|select|file/i)
  })

  test('rejects a non-pdf by mime type', () => {
    const result = validatePdfFile(fakeFile({ name: 'resume.docx', type: 'application/msword' }))
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/pdf/i)
  })

  test('accepts a .pdf by extension even when the browser reports an empty mime type', () => {
    const result = validatePdfFile(fakeFile({ name: 'My Resume.PDF', type: '' }))
    expect(result.ok).toBe(true)
  })

  test('rejects a file over the 5 MB cap', () => {
    const result = validatePdfFile(fakeFile({ size: MAX_PDF_BYTES + 1 }))
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/5\s?MB|too (large|big)/i)
  })

  test('accepts a file exactly at the cap', () => {
    expect(validatePdfFile(fakeFile({ size: MAX_PDF_BYTES })).ok).toBe(true)
  })
})

describe('assessExtractedText', () => {
  test('passes through text of adequate length', () => {
    const text = 'a'.repeat(MIN_TEXT_CHARS + 50)
    const result = assessExtractedText(text)
    expect(result.ok).toBe(true)
    expect(result.text).toBe(text)
  })

  test('bails on too-little text as a likely scanned/image PDF', () => {
    const result = assessExtractedText('short')
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/scan|image|couldn.?t read|text/i)
  })

  test('counts trimmed length, not whitespace padding', () => {
    const padded = '   ' + 'x'.repeat(10) + '\n\n   '
    const result = assessExtractedText(padded)
    expect(result.ok).toBe(false)
  })

  test('caps very long text at MAX_TEXT_CHARS', () => {
    const long = 'z'.repeat(MAX_TEXT_CHARS + 5000)
    const result = assessExtractedText(long)
    expect(result.ok).toBe(true)
    expect(result.text.length).toBe(MAX_TEXT_CHARS)
  })

  test('handles null/undefined input', () => {
    expect(assessExtractedText(null).ok).toBe(false)
    expect(assessExtractedText(undefined).ok).toBe(false)
  })
})
