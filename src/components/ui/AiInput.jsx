import { useState, useRef, useEffect, useCallback, useMemo, createContext, useContext } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { fixGrammarInHtml } from '../../lib/grammarFix'
import { getLinter } from '../../lib/harperLinter'
import { sanitizeHtml } from '../../lib/sanitizeHtml'
import { getCached, setCached } from '../../lib/aiCache'
import { canUseAI, recordUse, remaining, DAILY_LIMIT } from '../../lib/aiBudget'
import { scrubPii } from '../../lib/scrubPii'
import { formatContactLocal } from '../../lib/contactFormat'
import { streamAiTask } from '../../lib/streamAi'
import OnetSuggest from './OnetSuggest'
import JobTailor from './JobTailor'

const today = () => new Date().toISOString().slice(0, 10)
import './AiInput.css'

const SPEED_FACTOR = 1
const FORM_WIDTH = 540
const FORM_HEIGHT = 540 // square: match the largest dock dimension
const COOLDOWN_MS = 3000

const TASKS = [
  { id: 'improve', label: 'Improve wording', title: 'Rewrite this section for clarity and impact — stronger verbs, more concise. Sent to Groq AI.' },
  { id: 'grammar', label: 'Fix grammar',     title: 'Fix spelling and grammar only, keeping your wording. Runs on your device — nothing is sent.' },
  { id: 'format',  label: 'Format',          title: 'Reformat this section into the standard résumé layout for its type — clean contact lines, "School — City, State — Year" for education, title + duty bullets for experience, and so on. Sent to Groq AI.' },
  { id: 'ideas',   label: 'Suggest ideas',   title: 'Suggest 3 realistic bullet points you could add. Sent to Groq AI.' },
]

// Server-side input caps per task (mirrors api/ai.js TASKS.maxInput). Used for a
// friendly client pre-flight so the user isn't surprised by a 413 after waiting.
// grammar runs on-device (harper.js), so it has no cap here.
const MAX_INPUT = { improve: 2000, ideas: 2000, format: 6000 }

const MODE_TABS = [
  { id: 'ai',     label: 'Edit my text',   title: 'Improve, fix grammar, reformat, or get bullet-point ideas for the selected section.' },
  { id: 'onet',   label: 'Real job duties', title: 'Search a real occupation and add verbatim duties from O*NET job data.' },
  { id: 'tailor', label: 'Match a job',     title: 'Paste a job posting to see what your section matches or is missing, then tailor it.' },
]

// Models sometimes wrap output in ```html … ``` despite instructions — strip it.
function stripFences(s) {
  return s.replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '').trim()
}

function ColorOrb({ dimension = '24px', spinDuration = 20 }) {
  return (
    <div
      className="ai-orb"
      style={{ width: dimension, height: dimension, '--spin-duration': `${spinDuration}s` }}
    />
  )
}

const FormContext = createContext({})
const useFormCtx = () => useContext(FormContext)

function DockBar() {
  const { showForm, triggerOpen } = useFormCtx()
  return (
    <AnimatePresence>
      {!showForm && (
        <motion.footer
          className="ai-dock-bar"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div className="ai-dock-inner">
            <ColorOrb dimension="20px" />
            <button type="button" className="ai-trigger-btn" onClick={triggerOpen}>
              ✦ AI Assist
            </button>
          </div>
        </motion.footer>
      )}
    </AnimatePresence>
  )
}

function InputForm() {
  const { showForm, section, onApply } = useFormCtx()
  const [result, setResult] = useState('')
  const [resultFor, setResultFor] = useState(null) // section id the result was generated for
  const [lastTask, setLastTask] = useState(null)
  const [loading, setLoading] = useState(false) // drives the "Thinking…" spinner (off on first token)
  const [busy, setBusy] = useState(false)        // request in flight — disables the buttons end-to-end
  const [error, setError] = useState('')
  const [applied, setApplied] = useState(false)
  const [mode, setMode] = useState('ai') // 'ai' = rewrite tasks · 'onet' = real job duties
  const [groundOcc, setGroundOcc] = useState(null) // O*NET occupation to ground "ideas" on
  const [attempt, setAttempt] = useState(null)     // last task attempted, for the "Try again" button
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
    // Resetting local preview state when the section identity changes is the
    // documented "adjust state on prop change" case; we keep it in an effect
    // (rather than a key remount) to preserve the active tab + O*NET grounding.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResult(''); setResultFor(null); setLastTask(null); setAttempt(null)
    setError(''); setApplied(false); setBusy(false); setLoading(false)
    return () => abortRef.current?.abort()
  }, [sectionId])

  async function runTask(task) {
    if (busy) return
    if (!section) { setError('Select a section to edit first.'); return }
    if (coolingRef.current) { setError('One moment — try again in a second.'); return }

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
    // generative and still go to Groq.
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
    // name/email/phone (PII we won't send to Groq — the audience is minors).
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
      // "format" adapts to the section type — the proxy picks the right layout.
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

  function applyResult() {
    // Guard: never apply a preview built for a different section than the active one.
    if (!result || !section || resultFor !== section.id) return
    // 'ideas' returns new bullets to append; other tasks return the rewritten section.
    const next = lastTask === 'ideas' ? section.content + result : result
    onApply(next)
    setApplied(true)
    setTimeout(() => setApplied(false), 1500)
  }

  const applyLabel = lastTask === 'ideas' ? 'Add to section' : 'Apply to section'

  return (
    <form
      onSubmit={e => e.preventDefault()}
      className="ai-form"
      style={{ width: FORM_WIDTH, height: FORM_HEIGHT, pointerEvents: showForm ? 'all' : 'none' }}
    >
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 550 / SPEED_FACTOR, damping: 45, mass: 0.7 }}
            className="ai-form-inner"
          >
            <div className="ai-form-header">
              <span className="ai-form-title">AI Assist</span>
              <div className="ai-key-hints">
                <kbd className="ai-kbd">Esc</kbd>
              </div>
            </div>

            <div className="ai-section-tag">
              {section
                ? <>Editing: <strong>{section.title}</strong></>
                : 'Select a section to edit'}
            </div>

            <div className="ai-mode-tabs">
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

            {mode === 'onet' ? (
              <OnetSuggest
                onApply={html => onApply(section.content + html)}
                onOccupation={setGroundOcc}
              />
            ) : mode === 'tailor' ? (
              <JobTailor section={section} onApply={onApply} />
            ) : (
              <>
                <div className="ai-tasks">
                  {TASKS.map(t => {
                    // On a contact section, Improve/Suggest ideas would send the
                    // person's name/email/phone to Groq and aren't useful there.
                    // Grammar + Format stay (both run on-device for contact).
                    const contactBlocked = section?.type === 'contact' && (t.id === 'improve' || t.id === 'ideas')
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
                {/* Grounding only applies to "Suggest ideas", which is disabled
                    on contact sections — so hide this hint there. */}
                {section?.type !== 'contact' && (
                  groundOcc ? (
                    <div className="ai-ground-hint">
                      ✦ Ideas grounded in real <strong>{groundOcc.title}</strong> duties
                    </div>
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
                    <div
                      className="ai-result-text"
                      dangerouslySetInnerHTML={{ __html: result }}
                    />
                    <button type="button" className="ai-apply-btn" onClick={applyResult}>
                      {applied ? 'Applied ✓' : applyLabel}
                    </button>
                  </div>
                )}

                <div className="ai-consent">
                  {section?.type === 'contact'
                    ? '🔒 On a contact section everything runs on your device — nothing is sent.'
                    : '🔒 Fix grammar runs on your device — nothing is sent. Improve wording, Format & Suggest ideas send the section’s text to the AI service, so don’t put anything private in your résumé.'}
                  <span className="ai-budget">{aiLeft} of {DAILY_LIMIT} AI actions left today</span>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="ai-orb-absolute"
          >
            <ColorOrb dimension="20px" />
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  )
}

export function AiInput({ section = null, onApply = () => {} }) {
  const wrapperRef = useRef(null)
  const [showForm, setShowForm] = useState(false)

  const triggerClose = useCallback(() => setShowForm(false), [])
  const triggerOpen = useCallback(() => setShowForm(true), [])

  useEffect(() => {
    function clickOutside(e) {
      if (!showForm) return
      if (wrapperRef.current && wrapperRef.current.contains(e.target)) return
      // Keep the dock open while working inside the editor — switching sections,
      // editing text, or clicking the preview shouldn't dismiss it. Only a click
      // fully outside the editor closes it.
      if (e.target.closest && e.target.closest('.editor-layout')) return
      triggerClose()
    }
    function onKey(e) {
      if (e.key === 'Escape' && showForm) triggerClose()
    }
    document.addEventListener('mousedown', clickOutside)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', clickOutside)
      document.removeEventListener('keydown', onKey)
    }
  }, [showForm, triggerClose])

  const ctx = useMemo(
    () => ({ showForm, triggerOpen, triggerClose, section, onApply }),
    [showForm, triggerOpen, triggerClose, section, onApply]
  )

  return (
    <div className="ai-input-wrapper">
      <motion.div
        ref={wrapperRef}
        className="ai-panel"
        initial={false}
        animate={{
          width: showForm ? FORM_WIDTH : 'auto',
          height: showForm ? FORM_HEIGHT : 44,
          borderRadius: showForm ? 14 : 24,
        }}
        transition={{
          type: 'spring',
          stiffness: 550 / SPEED_FACTOR,
          damping: 45,
          mass: 0.7,
          delay: showForm ? 0 : 0.08,
        }}
      >
        <FormContext.Provider value={ctx}>
          <DockBar />
          <InputForm />
        </FormContext.Provider>
      </motion.div>
    </div>
  )
}

export default AiInput
