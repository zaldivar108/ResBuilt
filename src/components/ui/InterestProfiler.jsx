import { useState, useEffect } from 'react'
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
export default function InterestProfiler({ onClose, onStartResume }) {
  const [saved] = useState(loadSaved) // lazy init: read the cached result once
  const [stage, setStage] = useState(saved ? 'results' : 'loading') // loading|quiz|scoring|results|error
  const [error, setError] = useState('')
  const [options, setOptions] = useState([])
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState(() => new Map()) // index -> value 1..5
  const [areas, setAreas] = useState(saved?.areas ?? [])
  const [careers, setCareers] = useState(saved?.careers ?? [])

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

  function setAnswer(index, value) {
    setAnswers(prev => new Map(prev).set(index, value))
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
      <div className="modal ip-modal" onClick={e => e.stopPropagation()}>
        <button className="ip-close" onClick={onClose} aria-label="Close">×</button>

        {stage === 'loading' && <div className="ip-center"><div className="ip-spinner" />Loading the quiz…</div>}

        {stage === 'error' && (
          <div className="ip-center">
            <p className="ip-error">{error}</p>
            <button className="modal-btn create" onClick={onClose}>Close</button>
          </div>
        )}

        {stage === 'quiz' && (
          <>
            <div className="ip-head">
              <h2>Find a job that fits you</h2>
              <p className="ip-sub">For each activity, pick how much you’d like or dislike doing it. No right answers — just you.</p>
            </div>
            <div className="ip-progress"><div className="ip-progress-bar" style={{ width: `${(answeredCount / questions.length) * 100}%` }} /></div>
            <p className="ip-count">{answeredCount} of {questions.length} answered</p>
            <ol className="ip-questions">
              {questions.slice().sort((a, b) => a.index - b.index).map(q => (
                <li key={q.index} className="ip-q">
                  <span className="ip-q-text">{q.text}</span>
                  <div className="ip-scale" role="radiogroup" aria-label={q.text}>
                    {options.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={answers.get(q.index) === opt.value}
                        className={`ip-opt${answers.get(q.index) === opt.value ? ' active' : ''}`}
                        title={opt.name}
                        onClick={() => setAnswer(q.index, opt.value)}
                      >
                        {opt.name}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
            {error && <p className="ip-error">{error}</p>}
            <div className="ip-actions">
              <button className="modal-btn create" disabled={!allAnswered} onClick={submit}>
                See my results →
              </button>
            </div>
          </>
        )}

        {stage === 'scoring' && <div className="ip-center"><div className="ip-spinner" />Scoring your answers…</div>}

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

            <h3 className="ip-careers-title">Jobs that match — start a résumé for any of them</h3>
            <ul className="ip-careers">
              {careers.map(c => (
                <li key={c.code} className="ip-career">
                  <span className="ip-career-name">
                    {c.title}
                    {c.brightOutlook && <span className="ip-badge" title="Bright Outlook: expected to grow rapidly">🌟 Bright Outlook</span>}
                  </span>
                  <button className="ip-start" onClick={() => onStartResume(c.title)}>Start a résumé →</button>
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
