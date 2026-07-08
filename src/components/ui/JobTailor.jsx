import { useState, useRef, useEffect } from 'react'
import { parseTailorResult } from '../../lib/tailor'
import { sanitizeHtml } from '../../lib/sanitizeHtml'
import { bulletsFromTasks, getOccupationRemote, occupationToPosting } from '../../lib/onet'
import { getCached, setCached } from '../../lib/aiCache'
import { canUseAI, recordUse } from '../../lib/aiBudget'
import InterestProfiler from './InterestProfiler'

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
  const [showQuiz, setShowQuiz] = useState(false) // Interest Profiler modal open
  const [notice, setNotice] = useState('')        // one-line note after a quiz prefill
  const abortRef = useRef(null)    // cancels the in-flight request on unmount/tab switch
  const mountedRef = useRef(true)  // guards setState after unmount
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false; abortRef.current?.abort() }
  }, [])

  const combined = `JOB POSTING:\n${posting}\n\nRÉSUMÉ SECTION:\n${section?.content ?? ''}`

  function flash(msg) {
    setDone(msg)
    setTimeout(() => setDone(''), 1500)
  }

  function note(msg) {
    setNotice(msg)
    setTimeout(() => setNotice(''), 4000)
  }

  // Quiz result → target job. Fetch the chosen career's real O*NET duties and
  // prefill the posting box (editable). Degrades to the title if duties can't be
  // loaded, and never silently discards text the user already typed.
  async function pickCareer(career) {
    setShowQuiz(false)
    // Offline / proxy down → null, and occupationToPosting degrades to the title.
    const occupation = await getOccupationRemote(career.code, career.title).catch(() => null)
    if (!mountedRef.current) return
    const { text, degraded } = occupationToPosting(occupation, career.title)
    const hadText = posting.trim().length > 0
    setPosting(text)
    setAnalysis(null) // any prior analysis was for a different job
    if (degraded) {
      note(`Couldn’t load full duties — analyzing against “${career.title}”. Paste the real posting for a sharper match.`)
    } else if (hadText) {
      note(`Replaced with ${career.title} duties.`)
    }
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
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, text: combined }),
        signal: controller.signal,
      })
      const data = await res.json().catch(() => ({}))
      if (!mountedRef.current) return
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Try again.')
        return
      }
      const result = data.result || ''
      setCached(task, combined, result)
      recordUse(today())
      onResult(result)
    } catch (err) {
      if (err?.name === 'AbortError' || !mountedRef.current) return
      setError('Could not reach the AI. If running locally, use `vercel dev`.')
    } finally {
      if (mountedRef.current) setBusy(false)
    }
  }

  function analyze() {
    if (!posting.trim() || busy) return
    setAnalysis(null) // drop any stale analysis so it can't render beside a new error
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
      <div className="tailor-actions">
        <button type="button" className="onet-polish" disabled={!posting.trim() || busy} onClick={analyze}>
          {busy ? 'Analyzing…' : 'Analyze match'}
        </button>
        <button type="button" className="tailor-quiz-btn" disabled={busy} onClick={() => setShowQuiz(true)}>
          Not sure? Take the quiz
        </button>
      </div>

      {notice && <div className="ai-status" role="status" aria-live="polite">{notice}</div>}
      {error && <div className="ai-status ai-error" role="alert">{error}</div>}

      {showQuiz && (
        <InterestProfiler
          onClose={() => setShowQuiz(false)}
          onPickCareer={pickCareer}
        />
      )}

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
