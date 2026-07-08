import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Compass, Upload, Plus, Lock, FileText, CreditCard } from 'lucide-react'
import { useResume } from '../context/ResumeContext'
import ResumeCard from '../components/ResumeCard'
import ImportModal from '../components/ImportModal'
import InterestProfiler from '../components/ui/InterestProfiler'
import Switch from '../components/ui/switch'
import { STARTERS, DEFAULT_STARTER_ID } from '../config/starters'
import './Dashboard.css'

export default function Dashboard() {
  const navigate = useNavigate()
  const { resumes, createResume, createResumeFromImport, deleteResume, duplicateResume, darkMode, setDarkMode } = useResume()
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [starter, setStarter] = useState(DEFAULT_STARTER_ID)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [bizCardModal, setBizCardModal] = useState(false)
  const [importing, setImporting] = useState(false)
  const [profiling, setProfiling] = useState(false)

  function handleImported({ title, sections }) {
    const resume = createResumeFromImport(title, sections)
    setImporting(false)
    navigate(`/editor/${resume.id}`)
  }

  function handleStartFromCareer(careerTitle) {
    const resume = createResume(`${careerTitle} Resume`, DEFAULT_STARTER_ID)
    setProfiling(false)
    navigate(`/editor/${resume.id}`)
  }

  function openCreate() {
    setNewTitle('')
    setStarter(DEFAULT_STARTER_ID)
    setCreating(true)
  }

  function handleCreate(e) {
    e.preventDefault()
    const resume = createResume(newTitle.trim() || 'Untitled Resume', starter)
    setCreating(false)
    setNewTitle('')
    navigate(`/editor/${resume.id}`)
  }

  return (
    <div className={`dashboard${darkMode ? ' dark' : ''}`}>
      <nav className="dash-nav">
        <span className="wordmark dash-logo" onClick={() => navigate('/')}>ResBuilt</span>
        <div className="dash-nav-right">
          <Switch checked={darkMode} onCheckedChange={setDarkMode} />
          <span className="dash-privacy" title="No account required. Your resumes are stored only in this browser on this device.">
            <Lock size={12} strokeWidth={2} /> Private · saved on this device
          </span>
        </div>
      </nav>

      <div className="dash-content">
        <div className="dash-header">
          <div>
            <h1 className="dash-title">My résumés</h1>
            <p className="dash-subtitle">
              {resumes.length} résumé{resumes.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="dash-header-actions">
            <button className="btn-secondary" onClick={() => setProfiling(true)}>
              <Compass size={15} strokeWidth={1.75} /> Find a job that fits
            </button>
            <button className="btn-secondary" onClick={() => setBizCardModal(true)}>
              <CreditCard size={15} strokeWidth={1.75} /> Business card
            </button>
            <button className="btn-secondary" onClick={() => setImporting(true)}>
              <Upload size={15} strokeWidth={1.75} /> Import
            </button>
            <button className="btn-new-resume" onClick={openCreate}>
              <Plus size={15} strokeWidth={2} /> New résumé
            </button>
          </div>
        </div>

        {resumes.length === 0 ? (
          <div className="dash-empty">
            <div className="empty-icon"><FileText size={30} strokeWidth={1.5} /></div>
            <h2>No résumés yet</h2>
            <p>Create your first résumé to get started.</p>
            <button className="btn-new-resume" onClick={openCreate}>
              <Plus size={15} strokeWidth={2} /> New résumé
            </button>
          </div>
        ) : (
          <div className="resume-grid">
            {resumes.map(resume => (
              <ResumeCard
                key={resume.id}
                resume={resume}
                onDuplicate={() => duplicateResume(resume.id)}
                onDelete={() => setConfirmDeleteId(resume.id)}
              />
            ))}
          </div>
        )}
      </div>

      {confirmDeleteId && (() => {
        const resume = resumes.find(r => r.id === confirmDeleteId)
        return (
          <div className="delete-modal-overlay" onClick={() => setConfirmDeleteId(null)}>
            <div className="delete-modal" onClick={e => e.stopPropagation()}>
              <div className="delete-modal-title">Delete Resume?</div>
              <div className="delete-modal-body">
                <strong>"{resume?.title}"</strong> will be permanently deleted.
              </div>
              <div className="delete-modal-actions">
                <button className="delete-modal-cancel" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                <button className="delete-modal-confirm" onClick={() => { deleteResume(confirmDeleteId); setConfirmDeleteId(null) }}>Delete</button>
              </div>
            </div>
          </div>
        )
      })()}

      {importing && (
        <ImportModal onClose={() => setImporting(false)} onImported={handleImported} />
      )}

      {profiling && (
        <InterestProfiler onClose={() => setProfiling(false)} onStartResume={handleStartFromCareer} />
      )}

      {bizCardModal && (
        <div className="modal-overlay" onClick={() => setBizCardModal(false)}>
          <div className="modal bizcard-modal" onClick={e => e.stopPropagation()}>
            <div className="bizcard-modal-icon"><CreditCard size={30} strokeWidth={1.5} /></div>
            <h2>Business Cards</h2>
            <p className="bizcard-modal-desc">Design and export professional business cards — coming soon.</p>
            <button className="modal-btn create" onClick={() => setBizCardModal(false)}>Got it</button>
          </div>
        </div>
      )}

      {creating && (
        <div className="modal-overlay" onClick={() => setCreating(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>New Resume</h2>
            <form onSubmit={handleCreate}>
              <input
                autoFocus
                className="modal-input"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Resume title..."
              />

              <span className="starter-label">Start from</span>
              <div className="starter-options">
                {Object.values(STARTERS).map(s => (
                  <button
                    type="button"
                    key={s.id}
                    className={`starter-card${starter === s.id ? ' active' : ''}`}
                    onClick={() => setStarter(s.id)}
                    aria-pressed={starter === s.id}
                  >
                    <span className="starter-card-title">{s.label}</span>
                    <span className="starter-card-desc">{s.description}</span>
                  </button>
                ))}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="modal-btn cancel"
                  onClick={() => { setCreating(false); setNewTitle('') }}
                >
                  Cancel
                </button>
                <button type="submit" className="modal-btn create">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
