import { describe, test, expect } from 'vitest'
import {
  MAX_IMPORT_BYTES,
  MIN_TEXT_CHARS,
  MAX_TEXT_CHARS,
  fileKind,
  validateImportFile,
  assessExtractedText,
} from './pdfImport.js'

// Minimal stand-in for a File — we only touch name/type/size.
function fakeFile({ name = 'resume.pdf', type = 'application/pdf', size = 1000 } = {}) {
  return { name, type, size }
}

describe('fileKind', () => {
  test('classifies by extension', () => {
    expect(fileKind(fakeFile({ name: 'a.pdf', type: '' }))).toBe('pdf')
    expect(fileKind(fakeFile({ name: 'a.docx', type: '' }))).toBe('docx')
    expect(fileKind(fakeFile({ name: 'a.txt', type: '' }))).toBe('text')
    expect(fileKind(fakeFile({ name: 'notes.MD', type: '' }))).toBe('text')
  })

  test('falls back to MIME type when the extension is missing', () => {
    expect(fileKind(fakeFile({ name: 'blob', type: 'application/pdf' }))).toBe('pdf')
    expect(fileKind(fakeFile({ name: 'blob', type: 'text/plain' }))).toBe('text')
  })

  test('returns null for unsupported files (incl. legacy .doc)', () => {
    expect(fileKind(fakeFile({ name: 'a.doc', type: '' }))).toBeNull()
    expect(fileKind(fakeFile({ name: 'a.rtf', type: '' }))).toBeNull()
    expect(fileKind(null)).toBeNull()
  })
})

describe('validateImportFile', () => {
  test.each([
    ['resume.pdf', 'application/pdf'],
    ['resume.docx', ''],
    ['resume.txt', ''],
    ['resume.md', ''],
  ])('accepts %s', (name, type) => {
    expect(validateImportFile(fakeFile({ name, type })).ok).toBe(true)
  })

  test('rejects when no file is provided', () => {
    const r = validateImportFile(null)
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/choose|file/i)
  })

  test('rejects an unsupported type', () => {
    const r = validateImportFile(fakeFile({ name: 'resume.rtf', type: '' }))
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/pdf|docx|txt|md/i)
  })

  test('gives .doc users a helpful message', () => {
    const r = validateImportFile(fakeFile({ name: 'resume.doc', type: '' }))
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/\.docx|pdf/i)
  })

  test('rejects a file over the 5 MB cap', () => {
    const r = validateImportFile(fakeFile({ size: MAX_IMPORT_BYTES + 1 }))
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/5\s?MB|too (large|big)/i)
  })

  test('accepts a file exactly at the cap', () => {
    expect(validateImportFile(fakeFile({ size: MAX_IMPORT_BYTES })).ok).toBe(true)
  })
})

describe('assessExtractedText', () => {
  test('passes through text of adequate length', () => {
    const text = 'a'.repeat(MIN_TEXT_CHARS + 50)
    const result = assessExtractedText(text)
    expect(result.ok).toBe(true)
    expect(result.text).toBe(text)
  })

  test('bails on too-little text', () => {
    const result = assessExtractedText('short')
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/scan|image|text|file/i)
  })

  test('counts trimmed length, not whitespace padding', () => {
    expect(assessExtractedText('   ' + 'x'.repeat(10) + '\n\n   ').ok).toBe(false)
  })

  test('caps very long text at MAX_TEXT_CHARS', () => {
    const result = assessExtractedText('z'.repeat(MAX_TEXT_CHARS + 5000))
    expect(result.ok).toBe(true)
    expect(result.text.length).toBe(MAX_TEXT_CHARS)
  })

  test('handles null/undefined input', () => {
    expect(assessExtractedText(null).ok).toBe(false)
    expect(assessExtractedText(undefined).ok).toBe(false)
  })
})
