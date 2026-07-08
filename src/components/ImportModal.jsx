import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { importResumeFromFile } from '../lib/importResume'
import './ImportModal.css'

// "Import a résumé" modal (PDF, Word .docx, .txt, .md). Two states in one surface:
//   consent  → explain the privacy tradeoff, then let the user pick a file
//   working  → extracting on-device + one AI call (spinner)
// On success it hands the sections up via onImported(); errors stay inline.
export default function ImportModal({ onClose, onImported }) {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file after an error
    if (!file) return

    setBusy(true)
    setError('')
    const result = await importResumeFromFile(file)
    setBusy(false)

    if (!result.ok) {
      setError(result.error)
      return
    }
    onImported(result)
  }

  return (
    <div className="modal-overlay" onClick={busy ? undefined : onClose}>
      <div className="modal import-modal" onClick={e => e.stopPropagation()}>
        <div className="import-modal-icon"><Upload size={26} strokeWidth={1.5} /></div>
        <h2>Import a résumé</h2>

        {busy ? (
          <div className="import-working">
            <div className="import-spinner" aria-hidden="true" />
            <p>Reading your résumé and organizing it…</p>
          </div>
        ) : (
          <>
            <p className="import-modal-desc">
              We’ll read your file <strong>on this device</strong> and turn it into an editable résumé.
              Only the extracted text is sent — once — to our AI helper (Groq) to organize it into sections.
              The file itself never leaves your device.
            </p>
            <p className="import-modal-note">
              Don’t import a résumé with information you want to keep private. Supports PDF, Word
              (.docx), .txt, and .md (scanned/image PDFs aren’t supported). Max 5 MB.
            </p>

            {error && <div className="import-error" role="alert">{error}</div>}

            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
              className="import-file-input"
              onChange={handleFile}
            />

            <div className="modal-actions">
              <button type="button" className="modal-btn cancel" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="modal-btn create"
                onClick={() => inputRef.current?.click()}
              >
                Choose file &amp; import
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
