import { useState, useRef, useEffect, useMemo, createContext, useContext } from 'react'
import { Wand2 } from 'lucide-react'
import { suggestGroundingOccupation } from '../../lib/groundingSuggest'
import GroundingSuggestChip from './GroundingSuggestChip'
import { fixGrammarInHtml } from '../../lib/grammarFix'
import { getLinter } from '../../lib/harperLinter'
import { sanitizeHtml } from '../../lib/sanitizeHtml'
import { getCached, setCached } from '../../lib/aiCache'
import { canUseAI, recordUse, remaining, DAILY_LIMIT } from '../../lib/aiBudget'
import { scrubPii } from '../../lib/scrubPii'
import { formatContactLocal } from '../../lib/contactFormat'
import { streamAiTask } from '../../lib/streamAi'
import { buildImproveAllPrompt, parseImproveAllResult } from '../../lib/resumeImprove'
import OnetSuggest from './OnetSuggest'
import JobTailor from './JobTailor'
import DiffPreview from './DiffPreview'
import './AiInput.css'

const today = () => new Date().toISOString().slice(0, 10)
const COOLDOWN_MS = 3000

const TASKS = [
  { id: 'improve',  label: 'Improve wording', title: 'Rewrite this section for clarity and impact — stronger verbs, more concise. Sent to the AI service.' },
  { id: 'concise',  label: 'Make concise',    title: 'Shorten wordy phrasing while keeping every fact. Sent to the AI service.' },
  { id: 'elaborate', label: 'Elaborate',      title: 'Expand a thin section with more natural detail, without inventing new facts. Sent to the AI service.' },
  { id: 'grammar',  label: 'Fix grammar',     title: 'Fix spelling and grammar only, keeping your wording. Runs on your device — nothing is sent.' },
  { id: 'format',   label: 'Format',          title: 'Reformat this section into the standard résumé layout for its type — clean contact lines, "School — City, State — Year" for education, title + duty bullets for experience, and so on. Sent to the AI service.' },
  { id: 'ideas',    label: 'Suggest ideas',   title: 'Suggest 3 realistic bullet points you could add. Sent to the AI service.' },
]

// Server-side input caps per task (mirrors api/ai.js TASKS.maxInput). Used for a
// friendly client pre-flight so the user isn't surprised by a 413 after waiting.
// grammar runs on-device (harper.js), so it has no cap here.
const MAX_INPUT = { improve: 3500, concise: 3500, elaborate: 3500, ideas: 2000, format: 6000 }

const MODE_TABS = [
  { id: 'ai',     label: 'Edit my text',   title: 'Improve, fix grammar, reformat, or get bullet-point ideas for the selected section.' },
  { id: 'onet',   label: 'Real job duties', title: 'Search a real occupation and add verbatim duties from O*NET job data.' },
  { id: 'tailor', label: 'Match a job',     title: 'Paste a job posting to see what your section matches or is missing, then tailor it.' },
]

// Models sometimes wrap output in ```html … ``` despite instructions — strip it.
function stripFences(s) {
  return s.replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '').trim()
}

export function ColorOrb({ dimension = '24px', spinDuration = 20 }) {
  return (
    <div
      className="ai-orb"
      style={{ width: dimension, height: dimension, '--spin-duration': `${spinDuration}s` }}
    />
  )
}

// Shared AI state. The controls (sidebar) trigger tasks; the workspace (editor
// column) shows the textbox/answers. Both read from this single provider so the
// two surfaces stay in sync.
const AiCtx = createContext(null)
export const useAi = () => useContext(AiCtx)

export function AiProvider({
  section = null, onApply = () => {}, onApplyRange = () => ({ ok: false }), onApplyAll = () => {},
  targetJob = null, onSaveTargetJob = () => {},
  resumeTitle = '', sections = [], groundingDismissed = false, onDismissGrounding = () => {},
  children,
}) {
  const [result, setResult] = useState('')
  const [resultFor, setResultFor] = useState(null) // section id the result was generated for
  const [lastTask, setLastTask] = useState(null)
  const [loading, setLoading] = useState(false) // drives the "Thinking…" spinner (off on first token)
  const [busy, setBusy] = useState(false)        // request in flight — disables the buttons end-to-end
  const [error, setError] = useState('')
  const [applied, setApplied] = useState(false)
  const [mode, setMode] = useState('ai') // 'ai' = rewrite tasks · 'onet' = duties · 'tailor' = match · 'improveAll' = whole résumé
  const [groundOcc, setGroundOcc] = useState(null) // O*NET occupation to ground "ideas" on
  const [attempt, setAttempt] = useState(null)     // last task attempted, for the "Try again" button

  // Whole-résumé "Improve" — a separate, résumé-scoped action (not tied to the
  // active section like everything else here). Rewrites several sections in
  // one call; the user picks which ones to actually apply via a diff + checkbox
  // list in the workspace, same trust model as single-section Improve (verbatim
  // text, contact section excluded — see resumeImprove.js).
  const [improveAllState, setImproveAllState] = useState('idle') // idle | loading | done | error
  const [improveAllResult, setImproveAllResult] = useState(null) // bySection from parseImproveAllResult
  const [improveAllError, setImproveAllError] = useState('')
  const [improveAllSelected, setImproveAllSelected] = useState(new Set())
  // Selection-level "Improve this" (ADR 0006): set only while the current
  // result/Apply cycle is scoped to a captured text range, never a whole
  // section. Cleared the moment a normal (whole-section) task runs, or after
  // Apply resolves — a stale capture must never be reused.
  const [fragmentCaptured, setFragmentCaptured] = useState(null)
  const coolingRef = useRef(false)
  const reqIdRef = useRef(0)          // monotonic id: only the latest request may touch state
  const abortRef = useRef(null)       // cancels a superseded/abandoned request

  const sectionId = section?.id ?? null
  const aiLeft = remaining(today())

  // Switching sections must discard a preview generated for the old section —
  // otherwise "Apply" could silently write section A's result into section B.
  // Also aborts any in-flight request (and on unmount, e.g. tab switch).
  useEffect(() => {
    abortRef.current?.abort()
    reqIdRef.current++ // invalidate in-flight callbacks
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResult(''); setResultFor(null); setLastTask(null); setAttempt(null)
    setError(''); setApplied(false); setBusy(false); setLoading(false)
    setFragmentCaptured(null)
    return () => abortRef.current?.abort()
  }, [sectionId])

  async function runTask(task) {
    if (busy) return
    if (!section) { setError('Select a section to edit first.'); return }
    if (coolingRef.current) { setError('One moment — try again in a second.'); return }
    setFragmentCaptured(null) // a whole-section task supersedes any pending fragment context

    // Friendly length pre-flight — better than a post-hoc 413 after waiting.
    const limit = MAX_INPUT[task]
    if (limit && section.content.length > limit) {
      setError(`This section is long for AI (${section.content.length}/${limit} characters). Trim it or split it into two sections, then try again.`)
      return
    }

    coolingRef.current = true
    setTimeout(() => { coolingRef.current = false }, COOLDOWN_MS)

    const forId = section.id
    const reqId = ++reqIdRef.current
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const active = () => reqId === reqIdRef.current
    setAttempt(task)

    setBusy(true)
    setLoading(true)
    setError('')
    setResult('')
    setApplied(false)

    // Grammar runs fully on-device with harper.js — the text never leaves the
    // browser (and it doesn't spend the shared Groq quota). Improve / ideas are
    // generative and still go to the AI service.
    if (task === 'grammar') {
      try {
        const linter = await getLinter()
        const fixed = await fixGrammarInHtml(section.content, linter)
        if (!active()) return
        setResult(sanitizeHtml(fixed)); setResultFor(forId); setLastTask('grammar')
      } catch {
        if (active()) setError('Grammar check failed to load. Please try again.')
      } finally {
        if (active()) { setBusy(false); setLoading(false) }
      }
      return
    }

    // Contact "Format" runs fully on-device: a contact section is the person's
    // name/email/phone (PII we won't send to the AI service — the audience is minors).
    if (task === 'format' && section.type === 'contact') {
      const html = formatContactLocal(section.content)
      if (!active()) return
      setResult(sanitizeHtml(html)); setResultFor(forId); setLastTask('format')
      setBusy(false); setLoading(false)
      return
    }

    // "Suggest ideas" is context-only: ground it on the selected O*NET job (so
    // suggestions match real duties) and scrub PII before sending. Improve
    // rewrites the actual text, so it's sent verbatim.
    let sentText = section.content
    if (task === 'ideas') {
      if (groundOcc) {
        sentText += `\n\nContext — real duties for a ${groundOcc.title}: ${groundOcc.tasks.join('; ')}`
      }
      sentText = scrubPii(sentText)
    }

    // Serve an identical prior request from cache — free, no quota spent.
    // "format" output depends on the section type, so key on it too.
    const cacheKey = task === 'format' ? `${section.type}\n${sentText}` : sentText
    const cached = getCached(task, cacheKey)
    if (cached) {
      setResult(cached); setResultFor(forId); setLastTask(task)
      setBusy(false); setLoading(false)
      return
    }

    // Soft per-device daily cap to protect the shared free-tier quota.
    if (!canUseAI(today())) {
      setError('You’ve reached today’s AI limit. Fix grammar still works offline — or come back tomorrow.')
      setBusy(false); setLoading(false)
      return
    }

    try {
      // Stream tokens in as they arrive — swap the "Thinking…" spinner for the
      // growing preview on the first token. Content is sanitized on every update
      // so nothing unsafe is ever rendered mid-stream.
      const payload = { task, text: sentText }
      if (task === 'format') payload.sectionType = section.type

      let streamed = false
      const full = await streamAiTask(payload, partial => {
        if (!active()) return
        if (!streamed) { streamed = true; setLoading(false) }
        setResult(sanitizeHtml(stripFences(partial)))
      }, { signal: controller.signal })
      if (!active()) return
      const clean = sanitizeHtml(stripFences(full))
      setResult(clean); setResultFor(forId); setLastTask(task)
      setCached(task, cacheKey, clean)
      recordUse(today())
    } catch (err) {
      if (err?.name === 'AbortError' || !active()) return
      setError(err?.message || 'Could not reach the AI. If running locally, use `vercel dev`.')
    } finally {
      if (active()) { setBusy(false); setLoading(false) }
    }
  }

  // Selection-level "Improve this" (ADR 0006): same request lifecycle as
  // runTask (cooldown/cache/budget/abort), but sources text from a captured
  // fragment instead of the whole section, and never touches the `improve`
  // per-task branches (grammar/format/ideas) that don't apply to a fragment.
  async function runFragmentTask(captured) {
    if (busy) return
    if (!section || captured.sectionId !== section.id) {
      setError('This section changed — reselect the text and try again.')
      return
    }
    if (coolingRef.current) { setError('One moment — try again in a second.'); return }

    const limit = MAX_INPUT.improve
    if (captured.text.length > limit) {
      setError(`That selection is long for AI (${captured.text.length}/${limit} characters). Select a shorter fragment and try again.`)
      return
    }

    coolingRef.current = true
    setTimeout(() => { coolingRef.current = false }, COOLDOWN_MS)

    const forId = section.id
    const reqId = ++reqIdRef.current
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const active = () => reqId === reqIdRef.current
    setAttempt('improve')

    setBusy(true)
    setLoading(true)
    setError('')
    setResult('')
    setApplied(false)
    setFragmentCaptured(captured)

    const cacheKey = captured.text
    const cached = getCached('improve', cacheKey)
    if (cached) {
      setResult(cached); setResultFor(forId); setLastTask('improve')
      setBusy(false); setLoading(false)
      return
    }

    if (!canUseAI(today())) {
      setError('You’ve reached today’s AI limit. Fix grammar still works offline — or come back tomorrow.')
      setBusy(false); setLoading(false)
      return
    }

    try {
      const payload = { task: 'improve', text: captured.text, fragment: true }
      let streamed = false
      const full = await streamAiTask(payload, partial => {
        if (!active()) return
        if (!streamed) { streamed = true; setLoading(false) }
        setResult(sanitizeHtml(stripFences(partial)))
      }, { signal: controller.signal })
      if (!active()) return
      const clean = sanitizeHtml(stripFences(full))
      setResult(clean); setResultFor(forId); setLastTask('improve')
      setCached('improve', cacheKey, clean)
      recordUse(today())
    } catch (err) {
      if (err?.name === 'AbortError' || !active()) return
      setError(err?.message || 'Could not reach the AI. If running locally, use `vercel dev`.')
    } finally {
      if (active()) { setBusy(false); setLoading(false) }
    }
  }

  // Clears the applied result after the flash so the Apply button can never
  // be clicked a second time on stale data — a lingering `result` otherwise
  // reads as a fresh whole-section replacement on a second click, silently
  // overwriting the section with just the (already-applied) fragment text.
  function flashApplied() {
    setApplied(true)
    setTimeout(() => {
      setApplied(false)
      setResult(''); setResultFor(null); setLastTask(null)
    }, 1500)
  }

  function applyResult() {
    // Guard: never apply a preview built for a different section than the active one.
    if (!result || !section || resultFor !== section.id || applied) return

    if (fragmentCaptured) {
      const outcome = onApplyRange(fragmentCaptured, result)
      setFragmentCaptured(null) // one-shot — a used or refused capture must never be reused
      if (!outcome?.ok) {
        setError('This section changed since you selected that text — reselect and try again.')
        return
      }
      flashApplied()
      return
    }

    // 'ideas' returns new bullets to append; other tasks return the rewritten section.
    const next = lastTask === 'ideas' ? section.content + result : result
    onApply(next)
    flashApplied()
  }

  async function runImproveAll() {
    if (improveAllState === 'loading') return
    const { text, sectionTitles } = buildImproveAllPrompt(sections)
    if (!text.trim()) return

    function land(rawResult) {
      const parsed = parseImproveAllResult(rawResult, sectionTitles)
      if (!parsed.ok) { setImproveAllError(parsed.error); setImproveAllState('error'); return }
      setImproveAllResult(parsed.bySection)
      setImproveAllSelected(new Set(parsed.bySection.map(s => s.sectionId)))
      setImproveAllState('done')
    }

    const cached = getCached('improveAll', text)
    if (cached) { land(cached); return }
    if (!canUseAI(today())) {
      setImproveAllError('You’ve reached today’s AI limit. Come back tomorrow.')
      setImproveAllState('error')
      return
    }

    setImproveAllState('loading')
    setImproveAllError('')
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'improveAll', text }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setImproveAllError(data.error || 'Something went wrong. Try again.'); setImproveAllState('error'); return }
      setCached('improveAll', text, data.result)
      recordUse(today())
      land(data.result)
    } catch {
      setImproveAllError('Could not reach the AI. If running locally, use `vercel dev`.')
      setImproveAllState('error')
    }
  }

  function toggleImproveAllSelected(sectionId) {
    setImproveAllSelected(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) next.delete(sectionId)
      else next.add(sectionId)
      return next
    })
  }

  function applyImproveAllSelected() {
    if (!improveAllResult || !improveAllSelected.size) return
    const edits = improveAllResult
      .filter(s => improveAllSelected.has(s.sectionId))
      .map(s => ({ sectionId: s.sectionId, html: s.html }))
    onApplyAll(edits)
    setImproveAllState('idle')
    setImproveAllResult(null)
  }

  // The value changes on every state transition anyway (state lives here), so
  // memoizing it would buy nothing — build it plainly each render.
  const groundingSuggestion = useMemo(() => {
    if (groundOcc || groundingDismissed) return null
    return suggestGroundingOccupation({ title: resumeTitle, targetJob, sections })
  }, [groundOcc, groundingDismissed, resumeTitle, targetJob, sections])

  const value = {
    section, onApply, aiLeft, targetJob, onSaveTargetJob,
    groundingSuggestion, onDismissGrounding,
    mode, setMode, sections,
    result, resultFor, lastTask, loading, busy, error, applied, attempt,
    groundOcc, setGroundOcc,
    runTask, applyResult, runFragmentTask, fragmentCaptured,
    applyLabel: lastTask === 'ideas' ? 'Add to section' : 'Apply to section',
    improveAllState, improveAllResult, improveAllError, improveAllSelected,
    runImproveAll, toggleImproveAllSelected, applyImproveAllSelected,
  }

  return <AiCtx.Provider value={value}>{children}</AiCtx.Provider>
}

// ── Sidebar controls: mode tabs + (in "Edit my text") the task buttons ──
export function AiControls() {
  const { section, mode, setMode, runTask, busy } = useAi()
  return (
    <div className="ai-side">
      <div className="ai-side-head">
        <ColorOrb dimension="18px" spinDuration={22} />
        <span className="ai-side-title">AI Assist</span>
      </div>

      <div className="ai-mode-tabs ai-mode-tabs-side">
        {MODE_TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            className={`ai-mode-tab${mode === tab.id ? ' active' : ''}`}
            title={tab.title}
            aria-label={tab.title}
            onClick={() => setMode(tab.id)}
            disabled={busy || (tab.id !== 'ai' && !section)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        className={`ai-improve-all-btn${mode === 'improveAll' ? ' active' : ''}`}
        title="Rewrite every section for clarity in one AI pass — review each change before applying."
        aria-label="Improve whole résumé"
        onClick={() => setMode('improveAll')}
        disabled={busy}
      >
        <Wand2 size={14} /> Improve whole résumé
      </button>

      {mode === 'ai' ? (
        <div className="ai-tasks ai-tasks-side">
          {TASKS.map(t => {
            // On a contact section, any task that rewrites the actual text would
            // send the person's name/email/phone to the AI service and isn't
            // useful there anyway. Grammar + Format stay (both run on-device for contact).
            const contactBlocked = section?.type === 'contact' &&
              (t.id === 'improve' || t.id === 'concise' || t.id === 'elaborate' || t.id === 'ideas')
            return (
              <button
                key={t.id}
                type="button"
                className="ai-task-btn"
                title={contactBlocked ? 'Off for contact info — it stays private on your device.' : t.title}
                aria-label={contactBlocked ? 'Off for contact info — it stays private on your device.' : t.title}
                onClick={() => runTask(t.id)}
                disabled={busy || !section || contactBlocked}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      ) : (
        <p className="ai-side-note">
          {mode === 'improveAll'
            ? 'Results show in the editor →'
            : section
              ? 'The search box and results show in the editor →'
              : 'Select a section first.'}
        </p>
      )}
    </div>
  )
}

// ── Floating orb → click for a plain-language "how the AI & your data work" card ──
export function AiInfoOrb() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function onDown(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    function onKey(e) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="ai-orb-float" ref={ref}>
      {open && (
        <div className="ai-info-card" role="dialog" aria-label="How the AI and your data work">
          <div className="ai-info-title">How the AI works — and your privacy</div>

          <h4 className="ai-info-h ok">On your device — nothing is sent</h4>
          <p>Fix grammar, adding real job duties, and formatting your contact info all run inside your browser. That text never leaves your device.</p>

          <h4 className="ai-info-h">Sent to the AI service</h4>
          <p>Improve wording, Make concise, Elaborate, Format, Suggest ideas, and Match a job send that section’s text to our AI provider — <strong>OpenCode Zen</strong> free models, with <strong>Groq</strong> as an automatic backup. So don’t put anything private (ID numbers, passwords) in your résumé.</p>

          <h4 className="ai-info-h">Job search</h4>
          <p>“Real job duties” sends your search to <strong>O*NET</strong> (U.S. Dept. of Labor) to pull real occupation data.</p>

          <h4 className="ai-info-h">Your résumé stays here</h4>
          <p>No account needed. Everything saves in <strong>this browser</strong> only — never on our servers. There’s a soft limit of {DAILY_LIMIT} AI actions per day to keep the free service running.</p>
        </div>
      )}
      <button
        type="button"
        className="ai-orb-btn"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-label="About the AI and how your data is handled"
        title="About the AI & your privacy"
      >
        <ColorOrb dimension="30px" />
      </button>
    </div>
  )
}

// ── Editor-column workspace: the textbox + answers ──
export function AiWorkspace() {
  const {
    section, onApply, mode, groundOcc, setGroundOcc, sections,
    loading, error, busy, attempt, runTask,
    result, lastTask, applied, applyResult, applyLabel, aiLeft,
    targetJob, onSaveTargetJob, groundingSuggestion, onDismissGrounding,
    fragmentCaptured,
    improveAllState, improveAllResult, improveAllError, improveAllSelected,
    runImproveAll, toggleImproveAllSelected, applyImproveAllSelected,
  } = useAi()

  return (
    <div className="ai-workspace" aria-label="AI Assist workspace">
      <div className="ai-section-tag">
        {mode === 'improveAll'
          ? 'Improving your whole résumé'
          : section
            ? <>AI is editing: <strong>{section.title}</strong></>
            : 'Select a section to edit'}
      </div>

      {mode === 'improveAll' ? (
        <div className="ai-improve-all-ws">
          {improveAllState !== 'done' && (
            <>
              <button
                type="button"
                className="ai-apply-btn"
                onClick={runImproveAll}
                disabled={improveAllState === 'loading' || aiLeft <= 0}
              >
                {improveAllState === 'loading' ? 'Improving…' : 'Ask the AI to improve it'}
              </button>
              <p className="ai-consent">
                Rewrites every section for clarity — sends your whole résumé (except contact info) to the AI service verbatim — uses 1 of today's actions. You'll review every change before anything is applied.
                <span className="ai-budget">{aiLeft} of {DAILY_LIMIT} AI actions left today</span>
              </p>
              {improveAllState === 'error' && (
                <div className="ai-status ai-error" role="alert">
                  {improveAllError}
                  <button type="button" className="ai-retry-btn" onClick={runImproveAll}>Try again</button>
                </div>
              )}
            </>
          )}

          {improveAllState === 'done' && improveAllResult && (
            <div aria-live="polite">
              <ul className="ai-improve-all-list">
                {improveAllResult.map(s => {
                  const before = sections.find(sec => sec.id === s.sectionId)?.content ?? ''
                  return (
                    <li key={s.sectionId} className="ai-improve-all-item">
                      <label className="ai-improve-all-check">
                        <input
                          type="checkbox"
                          checked={improveAllSelected.has(s.sectionId)}
                          onChange={() => toggleImproveAllSelected(s.sectionId)}
                        />
                        <span className="ai-improve-all-title">{s.sectionTitle}</span>
                      </label>
                      <DiffPreview before={before} after={s.html} />
                    </li>
                  )
                })}
              </ul>
              <div className="ai-improve-all-actions">
                <button
                  type="button"
                  className="ai-apply-btn"
                  onClick={applyImproveAllSelected}
                  disabled={improveAllSelected.size === 0}
                >
                  Apply {improveAllSelected.size || ''} {improveAllSelected.size === 1 ? 'change' : 'changes'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : mode === 'onet' ? (
        section ? (
          <OnetSuggest
            onApply={html => onApply(section.content + html)}
            onOccupation={setGroundOcc}
          />
        ) : (
          <p className="ai-ws-empty">Select a section, then search a real job to pull in its duties.</p>
        )
      ) : mode === 'tailor' ? (
        <JobTailor section={section} onApply={onApply} targetJob={targetJob} onSaveTargetJob={onSaveTargetJob} />
      ) : (
        <>
          {/* Grounding only applies to "Suggest ideas", which is disabled on
              contact sections — so hide this hint there. */}
          {section?.type !== 'contact' && (
            groundOcc ? (
              <div className="ai-ground-hint">
                Ideas grounded in real <strong>{groundOcc.title}</strong> duties
              </div>
            ) : groundingSuggestion ? (
              <GroundingSuggestChip
                suggestion={groundingSuggestion}
                onAccept={setGroundOcc}
                onDismiss={onDismissGrounding}
              />
            ) : (
              <div className="ai-ground-hint ai-ground-tip">
                Tip: pick a job in <strong>Real job duties</strong> to ground “Suggest ideas” in real tasks.
              </div>
            )
          )}

          {loading && <div className="ai-status" role="status" aria-live="polite">Thinking…</div>}
          {error && (
            <div className="ai-status ai-error" role="alert">
              {error}
              {attempt && !busy && (
                <button type="button" className="ai-retry-btn" onClick={() => runTask(attempt)}>
                  Try again
                </button>
              )}
            </div>
          )}

          {result && !loading && (
            <div className="ai-result" aria-live="polite">
              {/* 'ideas' appends new bullets — nothing to diff against. Every
                  other task replaces the section, so show what changed. */}
              {lastTask === 'ideas' ? (
                <div
                  className="ai-result-text"
                  dangerouslySetInnerHTML={{ __html: result }}
                />
              ) : (
                <DiffPreview before={fragmentCaptured ? fragmentCaptured.text : section?.content} after={result} />
              )}
              <button type="button" className="ai-apply-btn" onClick={applyResult} disabled={applied}>
                {applied ? 'Applied ✓' : applyLabel}
              </button>
            </div>
          )}

          {!result && !loading && !error && (
            <p className="ai-ws-empty">
              {section
                ? <>Pick an action on the left to work on <strong>{section.title}</strong>.</>
                : 'Select a section to start.'}
            </p>
          )}

          <div className="ai-consent">
            {section?.type === 'contact'
              ? 'On a contact section everything runs on your device — nothing is sent.'
              : 'Fix grammar runs on your device — nothing is sent. Improve wording, Make concise, Elaborate, Format & Suggest ideas send the section’s text to the AI service, so don’t put anything private in your résumé.'}
            <span className="ai-budget">{aiLeft} of {DAILY_LIMIT} AI actions left today</span>
          </div>
        </>
      )}
    </div>
  )
}
