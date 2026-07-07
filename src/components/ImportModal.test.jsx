import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ImportModal from './ImportModal'
import { importResumeFromFile } from '../lib/importResume'

vi.mock('../lib/importResume', () => ({
  importResumeFromFile: vi.fn(),
}))

function pickFile() {
  const input = document.querySelector('.import-file-input')
  const file = new File(['%PDF-1.4'], 'resume.pdf', { type: 'application/pdf' })
  fireEvent.change(input, { target: { files: [file] } })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ImportModal', () => {
  test('shows the privacy consent copy before any upload', () => {
    render(<ImportModal onClose={() => {}} onImported={() => {}} />)
    expect(screen.getByText(/on this device/i)).toBeInTheDocument()
    expect(screen.getByText(/never leaves your device/i)).toBeInTheDocument()
  })

  test('calls onImported with the result on success', async () => {
    const result = { ok: true, title: 'resume', sections: [{ id: 'a', type: 'contact', title: 'Contact', content: '<p>x</p>' }] }
    importResumeFromFile.mockResolvedValue(result)
    const onImported = vi.fn()
    render(<ImportModal onClose={() => {}} onImported={onImported} />)

    pickFile()

    await waitFor(() => expect(onImported).toHaveBeenCalledWith(result))
  })

  test('shows the error inline and does not import on failure', async () => {
    importResumeFromFile.mockResolvedValue({ ok: false, error: 'That PDF is too large (max 5 MB).' })
    const onImported = vi.fn()
    render(<ImportModal onClose={() => {}} onImported={onImported} />)

    pickFile()

    expect(await screen.findByRole('alert')).toHaveTextContent(/too large/i)
    expect(onImported).not.toHaveBeenCalled()
  })

  test('does nothing when no file is chosen', () => {
    render(<ImportModal onClose={() => {}} onImported={() => {}} />)
    const input = document.querySelector('.import-file-input')
    fireEvent.change(input, { target: { files: [] } })
    expect(importResumeFromFile).not.toHaveBeenCalled()
  })
})
