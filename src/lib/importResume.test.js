import { describe, test, expect, vi } from 'vitest'
import { importResumeFromFile, titleFromFilename } from './importResume.js'
import { MAX_PDF_BYTES } from './pdfImport.js'

const goodText = 'Jane Doe\n' + 'Experienced student. '.repeat(20)
const goodJson = JSON.stringify({
  sections: [{ title: 'Contact', type: 'contact', content: '<p>Jane Doe</p>' }],
})

function file({ name = 'My Resume.pdf', type = 'application/pdf', size = 2000 } = {}) {
  return { name, type, size }
}

// Deps are injected so the orchestrator is testable without pdf.js or network.
function deps({ extract = async () => goodText, callImport = async () => ({ ok: true, result: goodJson }) } = {}) {
  return { extractText: vi.fn(extract), callImport: vi.fn(callImport) }
}

describe('titleFromFilename', () => {
  test('strips any supported extension', () => {
    expect(titleFromFilename('My Resume.pdf')).toBe('My Resume')
    expect(titleFromFilename('resume.PDF')).toBe('resume')
    expect(titleFromFilename('CV.docx')).toBe('CV')
    expect(titleFromFilename('notes.txt')).toBe('notes')
    expect(titleFromFilename('resume.md')).toBe('resume')
  })

  test('falls back for empty/odd names', () => {
    expect(titleFromFilename('')).toBe('Imported Resume')
    expect(titleFromFilename('.pdf')).toBe('Imported Resume')
  })
})

describe('importResumeFromFile — formats', () => {
  test.each([
    ['CV.docx', ''],
    ['resume.txt', ''],
    ['resume.md', ''],
  ])('accepts %s and imports it', async (name, type) => {
    const result = await importResumeFromFile(file({ name, type }), deps())
    expect(result.ok).toBe(true)
  })

  test('rejects legacy .doc with guidance, no extraction', async () => {
    const d = deps()
    const result = await importResumeFromFile(file({ name: 'old.doc', type: '' }), d)
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/\.docx|pdf/i)
    expect(d.extractText).not.toHaveBeenCalled()
  })
})

describe('importResumeFromFile — success', () => {
  test('returns normalized sections and a title from the filename', async () => {
    const d = deps()
    const result = await importResumeFromFile(file(), d)
    expect(result.ok).toBe(true)
    expect(result.title).toBe('My Resume')
    expect(result.sections[0].type).toBe('contact')
  })

  test('sends only the extracted text to the AI (the file never leaves)', async () => {
    const d = deps()
    await importResumeFromFile(file(), d)
    expect(d.callImport).toHaveBeenCalledWith(expect.any(String))
    const sent = d.callImport.mock.calls[0][0]
    expect(sent).toContain('Jane Doe')
  })
})

describe('importResumeFromFile — guarded failures (no AI call)', () => {
  test('rejects an unsupported type before extracting', async () => {
    const d = deps()
    const result = await importResumeFromFile(file({ name: 'x.rtf', type: 'application/rtf' }), d)
    expect(result.ok).toBe(false)
    expect(d.extractText).not.toHaveBeenCalled()
    expect(d.callImport).not.toHaveBeenCalled()
  })

  test('rejects an oversized file before extracting', async () => {
    const d = deps()
    const result = await importResumeFromFile(file({ size: MAX_PDF_BYTES + 1 }), d)
    expect(result.ok).toBe(false)
    expect(d.extractText).not.toHaveBeenCalled()
  })

  test('bails on a scanned/image PDF (too little text) without calling the AI', async () => {
    const d = deps({ extract: async () => 'tiny' })
    const result = await importResumeFromFile(file(), d)
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/scan|image|text/i)
    expect(d.callImport).not.toHaveBeenCalled()
  })
})

describe('importResumeFromFile — downstream failures', () => {
  test('surfaces an extraction error', async () => {
    const d = deps({ extract: async () => { throw new Error('boom') } })
    const result = await importResumeFromFile(file(), d)
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/read|pdf/i)
  })

  test('surfaces an AI error', async () => {
    const d = deps({ callImport: async () => ({ ok: false, error: 'AI is busy' }) })
    const result = await importResumeFromFile(file(), d)
    expect(result.ok).toBe(false)
    expect(result.error).toBe('AI is busy')
  })

  test('surfaces malformed AI JSON as a friendly error', async () => {
    const d = deps({ callImport: async () => ({ ok: true, result: 'not json {{{' }) })
    const result = await importResumeFromFile(file(), d)
    expect(result.ok).toBe(false)
    expect(typeof result.error).toBe('string')
  })
})
