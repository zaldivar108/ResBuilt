import { useState, useRef, useEffect, useCallback, useMemo, createContext, useContext } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import './AiInput.css'

const SPEED_FACTOR = 1
const FORM_WIDTH = 340
const FORM_HEIGHT = 200

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
              ✦ Coming Soon
            </button>
          </div>
        </motion.footer>
      )}
    </AnimatePresence>
  )
}

function InputForm({ textareaRef }) {
  const { triggerClose, showForm } = useFormCtx()

  function handleKeys(e) {
    if (e.key === 'Escape') triggerClose()
  }

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
            <textarea
              ref={textareaRef}
              placeholder="Coming soon..."
              className="ai-textarea"
              onKeyDown={handleKeys}
              spellCheck={false}
              disabled
            />
            <div className="ai-coming-soon-badge">🚀 AI resume features coming soon</div>
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

export function AiInput() {
  const wrapperRef = useRef(null)
  const textareaRef = useRef(null)
  const [showForm, setShowForm] = useState(false)

  const triggerClose = useCallback(() => setShowForm(false), [])
  const triggerOpen = useCallback(() => {
    setShowForm(true)
    setTimeout(() => textareaRef.current?.focus())
  }, [])

  useEffect(() => {
    function clickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target) && showForm) {
        triggerClose()
      }
    }
    document.addEventListener('mousedown', clickOutside)
    return () => document.removeEventListener('mousedown', clickOutside)
  }, [showForm, triggerClose])

  const ctx = useMemo(
    () => ({ showForm, triggerOpen, triggerClose }),
    [showForm, triggerOpen, triggerClose]
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
          <InputForm textareaRef={textareaRef} />
        </FormContext.Provider>
      </motion.div>
    </div>
  )
}

export default AiInput
