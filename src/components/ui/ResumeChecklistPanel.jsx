import { useEffect, useMemo, useRef } from 'react'
import { ListChecks, X, CircleCheck, ChevronRight } from 'lucide-react'
import { checkResume } from '../../lib/resumeChecklist'
import './ResumeChecklistPanel.css'

// On-device whole-résumé review (ADR 0002 / issue 001). Overlay modal so it
// never competes for space with the fixed-height AI dock — same pattern as
// InterestProfiler (role=dialog, Escape-to-close, focus-on-open).
export function ChecklistTriggerButton({ onClick }) {
  return (
    <button
      type="button"
      className="checklist-trigger-btn"
      onClick={onClick}
      title="Review my résumé"
      aria-label="Review my résumé"
    >
      <ListChecks size={16} />
      <span>Review</span>
    </button>
  )
}

export default function ResumeChecklistPanel({ sections, onSelectSection, onClose }) {
  const closeRef = useRef(null)
  const { findings } = useMemo(() => checkResume(sections), [sections])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    closeRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleFindingClick(finding) {
    if (!finding.sectionId) return
    onSelectSection(finding.sectionId)
    onClose()
  }

  return (
    <div className="checklist-modal-overlay" onClick={onClose}>
      <div
        className="checklist-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="checklist-modal-title"
        onClick={e => e.stopPropagation()}
      >
        <button ref={closeRef} className="checklist-modal-close" onClick={onClose} aria-label="Close review panel">
          <X size={18} />
        </button>
        <h2 id="checklist-modal-title" className="checklist-modal-title">Résumé review</h2>
        <p className="checklist-modal-sub">
          On-device suggestions — nothing here is sent anywhere. These are ideas, not fixes; you decide what to change.
        </p>

        <div className="checklist-findings" role="region" aria-live="polite" aria-label="Review findings">
          {findings.length === 0 ? (
            <div className="checklist-empty">
              <CircleCheck size={18} />
              <span>No suggestions right now — nice work.</span>
            </div>
          ) : (
            <ul className="checklist-list">
              {findings.map(finding => (
                <li key={finding.id}>
                  <button
                    type="button"
                    className="checklist-item"
                    onClick={() => handleFindingClick(finding)}
                    disabled={!finding.sectionId}
                  >
                    <span className="checklist-item-body">
                      {finding.sectionTitle && (
                        <span className="checklist-item-section">{finding.sectionTitle}</span>
                      )}
                      <span className="checklist-item-message">{finding.message}</span>
                    </span>
                    {finding.sectionId && <ChevronRight size={16} className="checklist-item-arrow" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
