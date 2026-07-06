import { useState, useRef, useEffect, useCallback, useMemo, createContext, useContext } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import './AiInput.css'

const SPEED_FACTOR = 1
const FORM_WIDTH = 360
const FORM_HEIGHT = 340
const COOLDOWN_MS = 3000

const TASKS = [
  { id: 'improve', label: 'Improve wording' },
  { id: 'grammar', label: 'Fix grammar' },
  { id: 'ideas',   label: 'Suggest ideas' },
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
  const [lastTask, setLastTask] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [applied, setApplied] = useState(false)
  const coolingRef = useRef(false)

  async function runTask(task) {
    if (loading) return
    if (!section) { setError('Select a section to edit first.'); return }
    if (coolingRef.current) { setError('One moment — try again in a second.'); return }
    coolingRef.current = true
    setTimeout(() => { coolingRef.current = false }, COOLDOWN_MS)

    setLoading(true)
    setError('')
    setResult('')
    setApplied(false)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, text: section.content }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Try again.')
        return
      }
      setResult(stripFences(data.result || ''))
      setLastTask(task)
    } catch {
      setError('Could not reach the AI. If running locally, use `vercel dev`.')
    } finally {
      setLoading(false)
    }
  }

  function applyResult() {
    if (!result || !section) return
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

            <div className="ai-tasks">
              {TASKS.map(t => (
                <button
                  key={t.id}
                  type="button"
                  className="ai-task-btn"
                  onClick={() => runTask(t.id)}
                  disabled={loading || !section}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {loading && <div className="ai-status">Thinking…</div>}
            {error && <div className="ai-status ai-error">{error}</div>}

            {result && !loading && (
              <div className="ai-result">
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
              🔒 The section's text is sent to Groq's AI to generate suggestions. Don't put anything you want to keep private in your résumé.
            </div>
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
      if (wrapperRef.current && !wrapperRef.current.contains(e.target) && showForm) {
        triggerClose()
      }
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
