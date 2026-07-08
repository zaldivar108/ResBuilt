import { useEffect, useMemo, useRef, useState } from 'react'
import { ListChecks, X, CircleCheck, ChevronRight, Sparkles } from 'lucide-react'
import { checkResume } from '../../lib/resumeChecklist'
import { buildReviewPrompt, parseReviewResult } from '../../lib/resumeReview'
import { getCached, setCached } from '../../lib/aiCache'
import { canUseAI, recordUse, remaining, DAILY_LIMIT } from '../../lib/aiBudget'
import './ResumeChecklistPanel.css'

const today = () => new Date().toISOString().slice(0, 10)

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
  const mountedRef = useRef(true)
  const { findings } = useMemo(() => checkResume(sections), [sections])

  const [aiState, setAiState] = useState('idle') // idle | loading | done | error
  const [aiResult, setAiResult] = useState(null)
  const [aiError, setAiError] = useState('')
  const aiLeft = remaining(today())

  useEffect(() => {
    mountedRef.current = true
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    closeRef.current?.focus()
    return () => { mountedRef.current = false; document.removeEventListener('keydown', onKey) }
  }, [onClose])

  function handleFindingClick(finding) {
    if (!finding.sectionId) return
    onSelectSection(finding.sectionId)
    onClose()
  }

  async function runAiReview() {
    if (aiState === 'loading') return
    const { text, sectionTitles } = buildReviewPrompt(sections)
    if (!text.trim()) return

    const cached = getCached('review', text)
    if (cached) {
      const parsed = parseReviewResult(cached, sectionTitles)
      if (parsed.ok) { setAiResult(parsed.bySection); setAiState('done') }
      else { setAiError(parsed.error); setAiState('error') }
      return
    }
    if (!canUseAI(today())) {
      setAiError('You’ve reached today’s AI limit. Come back tomorrow.')
      setAiState('error')
      return
    }

    setAiState('loading')
    setAiError('')
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'review', text }),
      })
      const data = await res.json().catch(() => ({}))
      if (!mountedRef.current) return
      if (!res.ok) { setAiError(data.error || 'Something went wrong. Try again.'); setAiState('error'); return }

      const parsed = parseReviewResult(data.result, sectionTitles)
      if (!parsed.ok) { setAiError(parsed.error); setAiState('error'); return }

      setCached('review', text, data.result)
      recordUse(today())
      setAiResult(parsed.bySection)
      setAiState('done')
    } catch {
      if (mountedRef.current) { setAiError('Could not reach the AI. If running locally, use `vercel dev`.'); setAiState('error') }
    }
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

        <div className="checklist-ai-section">
          <div className="checklist-ai-head">
            <Sparkles size={15} />
            <span>AI review (optional)</span>
          </div>

          {aiState !== 'done' && (
            <>
              <button
                type="button"
                className="checklist-ai-btn"
                onClick={runAiReview}
                disabled={aiState === 'loading' || aiLeft <= 0}
              >
                {aiState === 'loading' ? 'Reviewing…' : 'Ask the AI to review'}
              </button>
              <p className="checklist-ai-consent">
                Sends your whole résumé (contact info redacted) to the AI service — uses 1 of today's actions. {aiLeft} of {DAILY_LIMIT} left today.
              </p>
              {aiState === 'error' && (
                <div className="checklist-ai-error" role="alert">
                  {aiError}
                  <button type="button" className="checklist-ai-retry" onClick={runAiReview}>Try again</button>
                </div>
              )}
            </>
          )}

          {aiState === 'done' && aiResult && (
            <ul className="checklist-ai-list" aria-live="polite">
              {aiResult.map(s => (
                <li key={s.sectionId}>
                  <div className="checklist-ai-section-title">{s.sectionTitle}</div>
                  {s.strengths.map(item => (
                    <div key={item} className="checklist-ai-strength">{item}</div>
                  ))}
                  {s.issues.map(item => (
                    <div key={item} className="checklist-ai-issue">{item}</div>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
