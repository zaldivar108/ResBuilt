import { useState } from 'react'
import { searchOccupations, getOccupation, bulletsFromTasks } from '../../lib/onet'
import { sanitizeHtml } from '../../lib/sanitizeHtml'
import { canUseAI, recordUse } from '../../lib/aiBudget'

const today = () => new Date().toISOString().slice(0, 10)

// Grounds résumé bullets in real O*NET occupational data instead of AI guesses.
// Flow: search a job → pick it → check the real duties that apply →
//   "Add selected" inserts them verbatim (zero AI, zero hallucination), or
//   "✨ Make it mine" sends the picked duties to Groq's `polish` task to rewrite
//   them in a teen/entry-level voice (still grounded in the real tasks).
export default function OnetSuggest({ onApply }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [occupation, setOccupation] = useState(null)
  const [checked, setChecked] = useState(() => new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')

  function handleQuery(value) {
    setQuery(value)
    setResults(searchOccupations(value))
  }

  function pickOccupation(code) {
    setOccupation(getOccupation(code))
    setChecked(new Set())
    setResults([])
    setQuery('')
    setError('')
    setDone('')
  }

  function toggleTask(task) {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(task) ? next.delete(task) : next.add(task)
      return next
    })
  }

  const selectedTasks = occupation ? occupation.tasks.filter(t => checked.has(t)) : []

  function flash(msg) {
    setDone(msg)
    setTimeout(() => setDone(''), 1500)
  }

  function addRaw() {
    const html = bulletsFromTasks(selectedTasks)
    if (!html) return
    onApply(html)
    flash('Added ✓')
  }

  async function makeItMine() {
    if (!selectedTasks.length || busy) return
    if (!canUseAI(today())) {
      setError('You’ve reached today’s AI limit. “Add selected” still works — or come back tomorrow.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'polish', text: selectedTasks.join('\n') }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Try again.')
        return
      }
      const raw = (data.result || '').replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '').trim()
      const html = sanitizeHtml(raw)
      if (html) { onApply(html); recordUse(today()); flash('Added ✓') }
    } catch {
      setError('Could not reach the AI. If running locally, use `vercel dev`.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="onet-panel">
      {!occupation ? (
        <>
          <label className="onet-label" htmlFor="onet-search">Find your job</label>
          <input
            id="onet-search"
            className="onet-search"
            value={query}
            onChange={e => handleQuery(e.target.value)}
            placeholder="cashier, babysitter, barista…"
            autoComplete="off"
          />
          <ul className="onet-results">
            {results.map(r => (
              <li key={r.code}>
                <button type="button" className="onet-result-btn" onClick={() => pickOccupation(r.code)}>
                  {r.title}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <div className="onet-occ-head">
            <strong>{occupation.title}</strong>
            <button type="button" className="onet-change" onClick={() => setOccupation(null)}>Change</button>
          </div>
          <p className="onet-hint">Check the duties that apply to you:</p>
          <ul className="onet-tasks">
            {occupation.tasks.map(task => (
              <li key={task}>
                <label className="onet-task">
                  <input type="checkbox" checked={checked.has(task)} onChange={() => toggleTask(task)} />
                  <span>{task}</span>
                </label>
              </li>
            ))}
          </ul>

          {error && <div className="ai-status ai-error">{error}</div>}

          <div className="onet-actions">
            <button type="button" className="onet-add" disabled={!selectedTasks.length || busy} onClick={addRaw}>
              Add selected
            </button>
            <button type="button" className="onet-polish" disabled={!selectedTasks.length || busy} onClick={makeItMine}>
              {busy ? 'Working…' : done || '✨ Make it mine'}
            </button>
          </div>
        </>
      )}

      <div className="ai-consent onet-attr">
        Job data from <a href="https://services.onetcenter.org/" target="_blank" rel="noreferrer">O*NET</a> (U.S. Dept. of Labor, CC BY 4.0). “Add selected” stays on your device; “Make it mine” sends the checked duties to Groq.
      </div>
    </div>
  )
}
