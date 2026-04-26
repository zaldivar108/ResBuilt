import { useNavigate } from 'react-router-dom'
import { TEMPLATES } from '../config/templates'
import './ResumeCard.css'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

/* ── Template-specific card thumbnail ── */
function CardThumb({ templateId }) {
  if (templateId === 'modern') {
    return (
      <div className="thumb-mock thumb-modern">
        <div className="tm-sidebar-col">
          <div className="tm-sb-name" />
          <div className="tm-sb-line" />
          <div className="tm-sb-line short" />
          <div className="tm-sb-rule" />
          <div className="tm-sb-line accent" />
          <div className="tm-sb-line" />
          <div className="tm-sb-line short" />
          <div className="tm-sb-line accent" />
          <div className="tm-sb-line" />
        </div>
        <div className="tm-main-col">
          <div className="tm-line" style={{ width: '85%', background: '#4F46E5', height: 3 }} />
          <div className="tm-rule" style={{ background: '#4F46E5' }} />
          <div className="tm-line full" />
          <div className="tm-line med" />
          <div className="tm-line full" />
          <div className="tm-line" style={{ width: '85%', background: '#4F46E5', height: 3, marginTop: 4 }} />
          <div className="tm-rule" style={{ background: '#4F46E5' }} />
          <div className="tm-line full" />
          <div className="tm-line med" />
          <div className="tm-line short" />
        </div>
      </div>
    )
  }

  if (templateId === 'minimal') {
    return (
      <div className="thumb-mock thumb-minimal">
        <div className="tm-min-header">
          <div className="tm-line" style={{ width: '55%', height: 5, background: '#0F172A', borderRadius: 2, marginBottom: 4 }} />
          <div className="tm-line" style={{ width: '40%', height: 2, background: '#94A3B8', borderRadius: 2 }} />
        </div>
        <div className="tm-min-rule" />
        {[0, 1, 2].map(i => (
          <div key={i} className="tm-min-section">
            <div className="tm-line" style={{ width: '35%', height: 2, background: '#94A3B8', borderRadius: 2, marginBottom: 2 }} />
            <div style={{ width: 8, height: 1.5, background: '#94A3B8', borderRadius: 9999, marginBottom: 4 }} />
            <div className="tm-line full" />
            <div className="tm-line med" />
          </div>
        ))}
      </div>
    )
  }

  // Classic (default)
  return (
    <div className="thumb-mock">
      <div className="tm-line name" />
      <div className="tm-line sub" />
      <div className="tm-rule" />
      <div className="tm-line full" />
      <div className="tm-line med" />
      <div className="tm-line full" />
      <div className="tm-rule" />
      <div className="tm-line med" />
      <div className="tm-line full" />
      <div className="tm-line short" />
    </div>
  )
}

export default function ResumeCard({ resume, onDuplicate, onDelete }) {
  const navigate   = useNavigate()
  const templateId = resume.styles?.template ?? 'classic'
  const template   = TEMPLATES[templateId] ?? TEMPLATES.classic

  return (
    <div className="resume-card">
      <div className="card-thumb" onClick={() => navigate(`/editor/${resume.id}`)}>
        <CardThumb templateId={templateId} />
        <div className="card-thumb-hover">Open →</div>
      </div>

      <div className="card-body">
        <div>
          <h3 className="card-title">{resume.title}</h3>
          <div className="card-meta">
            <span
              className="card-template-badge"
              style={{ background: template.accentColor + '18', color: template.accentColor }}
            >
              {template.name}
            </span>
            <p className="card-date">Edited {formatDate(resume.lastEdited)}</p>
          </div>
        </div>
        <div className="card-actions">
          <button
            className="ca-btn primary"
            onClick={() => navigate(`/editor/${resume.id}`)}
          >
            Edit
          </button>
          <button className="ca-btn" onClick={onDuplicate}>Duplicate</button>
          <button className="ca-btn danger" onClick={onDelete}>Delete</button>
        </div>
      </div>
    </div>
  )
}
