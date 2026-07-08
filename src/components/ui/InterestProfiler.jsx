import { useState, useEffect, useRef } from 'react'
import {
  fetchProfilerQuestions,
  scoreAnswers,
  matchingCareers,
} from '../../lib/onetIp'
import './InterestProfiler.css'

const STORAGE_KEY = 'resbuilt_ip_result'

function loadSaved() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) } catch { return null }
}
function saveResult(result) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(result)) } catch { /* quota — non-fatal */ }
}

// Interest Profiler quiz (O*NET Mini-IP, 30 questions). Free, on-device except
// the three proxied O*NET calls (questions, scoring, matching careers — no PII
// leaves the browser). Flow: intro/loading → quiz → results (RIASEC + careers).
// A finished result is cached in localStorage so reopening lands on results.
// `onStartResume(title)` is the dashboard action (create a new résumé). When
// `onPickCareer(career)` is supplied (from the editor's Job match tab), the
// career buttons instead hand back the full career object to tailor toward.
export default function InterestProfiler({ onClose, onStartResume, onPickCareer }) {
  const [saved] = useState(loadSaved) // lazy init: read the cached result once
  const [stage, setStage] = useState(saved ? 'results' : 'loading') // loading|quiz|scoring|results|error
  const [error, setError] = useState('')
  const [options, setOptions] = useState([])
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState(() => new Map()) // index -> value 1..5
  const [current, setCurrent] = useState(0) // position in the ordered question list
  const [areas, setAreas] = useState(saved?.areas ?? [])
  const [careers, setCareers] = useState(saved?.careers ?? [])
  const closeRef = useRef(null)

  // Dialog behavior: Escape closes; move focus into the modal on open.
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    closeRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Questions in the order O*NET indexes them; drives the one-at-a-time flow.
  const ordered = [...questions].sort((a, b) => a.index - b.index)

  // Fetch questions on mount unless we already have a saved result to show.
  useEffect(() => {
    if (saved) return
    let live = true
    fetchProfilerQuestions()
      .then(({ options, questions }) => {
        if (!live) return
        if (!questions.length) { setError('Could not load the quiz. Try again shortly.'); setStage('error'); return }
        setOptions(options)
        setQuestions(questions)
        setStage('quiz')
      })
      .catch(() => { if (live) { setError('Could not reach the quiz. If running locally, use `vercel dev`.'); setStage('error') } })
    return () => { live = false }
  }, [saved])

  const answeredCount = answers.size
  const allAnswered = questions.length > 0 && answeredCount === questions.length

  // Record the answer and auto-advance to the next unanswered-or-next question.
  function chooseAnswer(index, value) {
    setAnswers(prev => new Map(prev).set(index, value))
    if (current < ordered.length - 1) {
      setCurrent(c => Math.min(c + 1, ordered.length - 1))
    }
  }

  function buildAnswerString() {
    // O*NET expects one digit per question, ordered by question index.
    return questions
      .slice()
      .sort((a, b) => a.index - b.index)
      .map(q => answers.get(q.index) ?? 3)
      .join('')
  }

  async function submit() {
    setStage('scoring')
    setError('')
    try {
      const scored = await scoreAnswers(buildAnswerString())
      const { careers } = await matchingCareers(scored)
      setAreas(scored)
      setCareers(careers)
      setStage('results')
      saveResult({ areas: scored, careers, date: new Date().toISOString() })
    } catch (e) {
      setError(e?.message || 'Something went wrong scoring your answers.')
      setStage('quiz')
    }
  }

  function retake() {
    setAnswers(new Map())
    setCurrent(0)
    setAreas([])
    setCareers([])
    setError('')
    setStage(questions.length ? 'quiz' : 'loading')
    if (!questions.length) {
      fetchProfilerQuestions()
        .then(({ options, questions }) => { setOptions(options); setQuestions(questions); setStage('quiz') })
        .catch(() => { setError('Could not reach the quiz.'); setStage('error') })
    }
  }

  const maxScore = Math.max(1, ...areas.map(a => a.score))

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal ip-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Find a job that fits you"
        onClick={e => e.stopPropagation()}
      >
        <button ref={closeRef} className="ip-close" onClick={onClose} aria-label="Close">×</button>

        {stage === 'loading' && <div className="ip-center" role="status" aria-live="polite"><div className="ip-spinner" />Loading the quiz…</div>}

        {stage === 'error' && (
          <div className="ip-center">
            <p className="ip-error" role="alert">{error}</p>
            <button className="modal-btn create" onClick={onClose}>Close</button>
          </div>
        )}

        {stage === 'quiz' && ordered[current] && (() => {
          const q = ordered[current]
          const isLast = current === ordered.length - 1
          return (
            <>
              <div className="ip-head">
                <h2>Find a job that fits you</h2>
                <p className="ip-sub">Would you like or dislike doing this activity? No right answers — just you.</p>
              </div>
              <div className="ip-progress"><div className="ip-progress-bar" style={{ width: `${((current + 1) / ordered.length) * 100}%` }} /></div>
              <p className="ip-count">Question {current + 1} of {ordered.length} · {answeredCount} answered</p>

              <div className="ip-single">
                <span className="ip-q-num">{current + 1}.</span>
                <p className="ip-q-text-lg">{q.text}</p>
                <div className="ip-scale ip-scale-col" role="radiogroup" aria-label={q.text}>
                  {options.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={answers.get(q.index) === opt.value}
                      className={`ip-opt${answers.get(q.index) === opt.value ? ' active' : ''}`}
                      onClick={() => chooseAnswer(q.index, opt.value)}
                    >
                      {opt.name}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="ip-error" role="alert">{error}</p>}
              <div className="ip-actions ip-actions-split">
                <button className="modal-btn cancel" disabled={current === 0} onClick={() => setCurrent(c => Math.max(0, c - 1))}>
                  ← Back
                </button>
                {isLast || allAnswered ? (
                  <button className="modal-btn create" disabled={!allAnswered} onClick={submit}>
                    See my results →
                  </button>
                ) : (
                  <button className="modal-btn create" disabled={!answers.has(q.index)} onClick={() => setCurrent(c => Math.min(ordered.length - 1, c + 1))}>
                    Next →
                  </button>
                )}
              </div>
            </>
          )
        })()}

        {stage === 'scoring' && <div className="ip-center" role="status" aria-live="polite"><div className="ip-spinner" />Scoring your answers…</div>}

        {stage === 'results' && (
          <>
            <div className="ip-head">
              <h2>Your top interests</h2>
              {areas[0] && <p className="ip-sub"><strong>{areas[0].title}.</strong> {areas[0].description}</p>}
            </div>
            <ul className="ip-bars">
              {areas.map(a => (
                <li key={a.code} className="ip-bar-row">
                  <span className="ip-bar-label">{a.title}</span>
                  <span className="ip-bar-track"><span className="ip-bar-fill" style={{ width: `${(a.score / maxScore) * 100}%` }} /></span>
                </li>
              ))}
            </ul>

            <h3 className="ip-careers-title">
              {onPickCareer ? 'Jobs that match — tailor your résumé for any of them' : 'Jobs that match — start a résumé for any of them'}
            </h3>
            <ul className="ip-careers">
              {careers.map(c => (
                <li key={c.code} className="ip-career">
                  <span className="ip-career-name">
                    {c.title}
                    {c.brightOutlook && <span className="ip-badge" title="Bright Outlook: expected to grow rapidly">🌟 Bright Outlook</span>}
                  </span>
                  {onPickCareer ? (
                    <button className="ip-start" onClick={() => onPickCareer(c)}>Tailor for this →</button>
                  ) : (
                    <button className="ip-start" onClick={() => onStartResume(c.title)}>Start a résumé →</button>
                  )}
                </li>
              ))}
            </ul>

            <div className="ip-actions ip-actions-split">
              <button className="modal-btn cancel" onClick={retake}>Retake quiz</button>
              <button className="modal-btn create" onClick={onClose}>Done</button>
            </div>
            <p className="ip-attr">
              Interests &amp; careers from the <a href="https://www.onetcenter.org/IP.html" target="_blank" rel="noreferrer">O*NET Interest Profiler</a> (U.S. Dept. of Labor, CC BY 4.0).
            </p>
          </>
        )}
      </div>
    </div>
  )
}
