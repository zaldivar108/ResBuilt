import { useState, useRef, useEffect } from 'react'
import {
  searchOccupations,
  getOccupation,
  searchOccupationsRemote,
  getOccupationRemote,
  bulletsFromTasks,
} from '../../lib/onet'
import { sanitizeHtml } from '../../lib/sanitizeHtml'
import { canUseAI, recordUse } from '../../lib/aiBudget'

const today = () => new Date().toISOString().slice(0, 10)
const SEARCH_DEBOUNCE_MS = 300

// Grounds résumé bullets in real O*NET occupational data instead of AI guesses.
// Flow: search a job → pick it → check the real duties that apply →
//   "Add selected" inserts them verbatim (zero AI, zero hallucination), or
//   "✨ Make it mine" sends the picked duties to Groq's `polish` task to rewrite
//   them in a teen/entry-level voice (still grounded in the real tasks).
export default function OnetSuggest({ onApply, onOccupation = () => {} }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [occupation, setOccupation] = useState(null)
  const [checked, setChecked] = useState(() => new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')

  // Debounce live search; a query counter drops out-of-order responses.
  const debounceRef = useRef(null)
  const queryIdRef = useRef(0)
  useEffect(() => () => clearTimeout(debounceRef.current), [])

  function handleQuery(value) {
    setQuery(value)
    const q = value.trim()
    // Instant local results keep the box responsive; the live search (if the
    // proxy is configured) replaces them a beat later with the full catalog.
    setResults(searchOccupations(value))
    clearTimeout(debounceRef.current)
    if (!q) return
    const id = ++queryIdRef.current
    debounceRef.current = setTimeout(async () => {
      try {
        const remote = await searchOccupationsRemote(q)
        if (id !== queryIdRef.current) return // a newer keystroke won
        if (remote.length) setResults(remote)
      } catch {
        // Proxy unavailable/offline — the seed results already shown stand.
      }
    }, SEARCH_DEBOUNCE_MS)
  }

  async function pickOccupation(code, title = '') {
    // Prefer the live record (full task/skill lists); fall back to the seed.
    let occ = null
    try {
      occ = await getOccupationRemote(code, title)
    } catch {
      occ = null
    }
    if (!occ || !occ.tasks?.length) occ = getOccupation(code)
    if (!occ) { setError('Could not load that occupation. Try another.'); return }
    setOccupation(occ)
    onOccupation(occ) // share it so "Suggest ideas" can ground on it too
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
                <button type="button" className="onet-result-btn" onClick={() => pickOccupation(r.code, r.title)}>
                  {r.title}
                </button>
              </li>
            ))}
          </ul>
          {query.trim().length >= 2 && results.length === 0 && (
            <p className="onet-empty">No matching jobs. Try a different word (e.g. “cashier”, “tutor”, “barista”).</p>
          )}
        </>
      ) : (
        <>
          <div className="onet-occ-head">
            <strong>{occupation.title}</strong>
            <button type="button" className="onet-change" onClick={() => { setOccupation(null); onOccupation(null) }}>Change</button>
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
        Job data from <a href="https://services.onetcenter.org/" target="_blank" rel="noreferrer">O*NET</a> (U.S. Dept. of Labor, CC BY 4.0). Your search is sent to O*NET to fetch real duties. “Add selected” then stays on your device; “Make it mine” sends the checked duties to Groq.
      </div>
    </div>
  )
}
