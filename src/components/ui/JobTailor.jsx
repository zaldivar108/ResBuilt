import { useState } from 'react'
import { parseTailorResult } from '../../lib/tailor'
import { sanitizeHtml } from '../../lib/sanitizeHtml'
import { bulletsFromTasks } from '../../lib/onet'
import { getCached, setCached } from '../../lib/aiCache'
import { canUseAI, recordUse } from '../../lib/aiBudget'

const today = () => new Date().toISOString().slice(0, 10)

// "Match a job" tab: paste a job posting → gap analysis (matched / missing
// keywords + honest bullet suggestions) grounded against THIS section. Optional
// one-click rewrite reorders the section's existing content to fit the posting
// (no fabrication). One 8B call per action, cached + budgeted.
export default function JobTailor({ section, onApply }) {
  const [posting, setPosting] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')

  const combined = `JOB POSTING:\n${posting}\n\nRÉSUMÉ SECTION:\n${section?.content ?? ''}`

  function flash(msg) {
    setDone(msg)
    setTimeout(() => setDone(''), 1500)
  }

  async function callTask(task, onResult) {
    const cached = getCached(task, combined)
    if (cached) return onResult(cached)
    if (!canUseAI(today())) {
      setError('You’ve reached today’s AI limit — come back tomorrow.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, text: combined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Try again.')
        return
      }
      const result = data.result || ''
      setCached(task, combined, result)
      recordUse(today())
      onResult(result)
    } catch {
      setError('Could not reach the AI. If running locally, use `vercel dev`.')
    } finally {
      setBusy(false)
    }
  }

  function analyze() {
    if (!posting.trim() || busy) return
    callTask('tailor', result => {
      const parsed = parseTailorResult(result)
      if (!parsed.ok) { setError(parsed.error); return }
      setAnalysis(parsed)
    })
  }

  function addSuggestion(text) {
    onApply((section?.content ?? '') + bulletsFromTasks([text]))
    flash('Added ✓')
  }

  function rewriteForJob() {
    if (busy) return
    callTask('retarget', result => {
      const html = sanitizeHtml(result.replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '').trim())
      if (html) { onApply(html); flash('Section rewritten ✓') }
    })
  }

  return (
    <div className="tailor-panel">
      <label className="onet-label" htmlFor="tailor-posting">Paste a job posting</label>
      <textarea
        id="tailor-posting"
        className="tailor-textarea"
        value={posting}
        onChange={e => setPosting(e.target.value)}
        placeholder="Paste the job description here…"
        rows={4}
      />
      <button type="button" className="onet-polish" disabled={!posting.trim() || busy} onClick={analyze}>
        {busy ? 'Analyzing…' : 'Analyze match'}
      </button>

      {error && <div className="ai-status ai-error">{error}</div>}

      {analysis && !busy && (
        <div className="tailor-results">
          {analysis.matched.length > 0 && (
            <div className="tailor-group">
              <span className="tailor-group-label ok">✓ You already have</span>
              <div className="tailor-chips">
                {analysis.matched.map(k => <span key={k} className="tailor-chip ok">{k}</span>)}
              </div>
            </div>
          )}
          {analysis.missing.length > 0 && (
            <div className="tailor-group">
              <span className="tailor-group-label miss">✗ Missing from this section</span>
              <div className="tailor-chips">
                {analysis.missing.map(k => <span key={k} className="tailor-chip miss">{k}</span>)}
              </div>
            </div>
          )}
          {analysis.suggestions.length > 0 && (
            <div className="tailor-group">
              <span className="tailor-group-label">Suggested bullets (add if true)</span>
              <ul className="tailor-suggestions">
                {analysis.suggestions.map(s => (
                  <li key={s}>
                    <span>{s}</span>
                    <button type="button" className="tailor-add" onClick={() => addSuggestion(s)}>Add</button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button type="button" className="onet-add tailor-rewrite" disabled={busy} onClick={rewriteForJob}>
            {done || 'Rewrite this section for the job'}
          </button>
          <p className="tailor-note">Rewrite only reorders what’s already here — it won’t invent new facts.</p>
        </div>
      )}
    </div>
  )
}
