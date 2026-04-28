import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useResume } from '../context/ResumeContext'
import ResumeCard from '../components/ResumeCard'
import Switch from '../components/ui/switch'
import './Dashboard.css'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, resumes, createResume, deleteResume, duplicateResume, logout, darkMode, setDarkMode } = useResume()
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  function handleCreate(e) {
    e.preventDefault()
    const resume = createResume(newTitle.trim() || 'Untitled Resume')
    setCreating(false)
    setNewTitle('')
    navigate(`/editor/${resume.id}`)
  }

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <div className={`dashboard${darkMode ? ' dark' : ''}`}>
      <nav className="dash-nav">
        <span className="dash-logo" onClick={() => navigate('/')}>ResBuilt</span>
        <div className="dash-nav-right">
          <Switch checked={darkMode} onCheckedChange={setDarkMode} />
          <span className="dash-user">{user?.email}</span>
          <button className="dash-logout" onClick={handleLogout}>Log out</button>
        </div>
      </nav>

      <div className="dash-content">
        <div className="dash-header">
          <div>
            <h1 className="dash-title">My Resumes</h1>
            <p className="dash-subtitle">
              {resumes.length} resume{resumes.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button className="btn-new-resume" onClick={() => setCreating(true)}>
            + New Resume
          </button>
        </div>

        {resumes.length === 0 ? (
          <div className="dash-empty">
            <div className="empty-icon">📄</div>
            <h2>No resumes yet</h2>
            <p>Create your first resume to get started.</p>
            <button className="btn-new-resume" onClick={() => setCreating(true)}>
              + New Resume
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
