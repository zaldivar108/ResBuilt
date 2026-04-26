import { useNavigate } from 'react-router-dom'
import './ResumeCard.css'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export default function ResumeCard({ resume, onDuplicate, onDelete }) {
  const navigate = useNavigate()

  return (
    <div className="resume-card">
      <div className="card-thumb" onClick={() => navigate(`/editor/${resume.id}`)}>
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
        <div className="card-thumb-hover">Open →</div>
      </div>

      <div className="card-body">
        <div>
          <h3 className="card-title">{resume.title}</h3>
          <p className="card-date">Edited {formatDate(resume.lastEdited)}</p>
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
