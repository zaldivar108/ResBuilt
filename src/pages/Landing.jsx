import { useNavigate } from 'react-router-dom'
import { PenLine, LayoutTemplate, Printer, ShieldCheck } from 'lucide-react'
import { useResume } from '../context/ResumeContext'
import { APP_VERSION } from '../version'
import './Landing.css'

const FEATURES = [
  {
    icon: PenLine,
    title: 'A real editor',
    desc: 'Write, reorder, and restyle sections with a live preview beside you.',
  },
  {
    icon: LayoutTemplate,
    title: 'Six layouts',
    desc: 'Classic to modern — every template stays clean and recruiter-readable.',
  },
  {
    icon: Printer,
    title: 'Print-ready PDF',
    desc: 'Letter or A4, tuned margins, one-click export. No watermarks.',
  },
  {
    icon: ShieldCheck,
    title: 'Private by default',
    desc: 'No account. Your résumé lives in this browser, not on a server.',
  },
]

/* CSS-drawn résumé page for the hero — product-specific, no stock art */
function HeroPaper() {
  return (
    <div className="hero-paper" aria-hidden="true">
      <div className="hp-name" />
      <div className="hp-sub" />
      <div className="hp-rule" />
      {[0, 1, 2].map(i => (
        <div key={i} className="hp-block">
          <div className="hp-heading" />
          <div className="hp-line w-92" />
          <div className="hp-line w-78" />
          {i < 2 && <div className="hp-line w-60" />}
        </div>
      ))}
      <div className="hp-chip">Reviewed by AI, grounded in real job data</div>
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const { resumes } = useResume()

  return (
    <div className="landing">
      <nav className="landing-nav">
        <span className="landing-brand">
          <span className="wordmark">ResBuilt</span>
          <span className="landing-version">v{APP_VERSION}</span>
        </span>
        <button className="btn-nav" onClick={() => navigate('/dashboard')}>
          {resumes.length > 0 ? 'My résumés' : 'Get started'}
        </button>
      </nav>

      <main className="landing-hero">
        <div className="hero-copy">
          <p className="hero-eyebrow">Free forever · No sign-up</p>
          <h1 className="hero-title">
            Your first résumé,<br />
            <em>done properly.</em>
          </h1>
          <p className="hero-subtitle">
            Built for students and first jobs — school, part-time work,
            internships, and college applications. Write it here, keep it here:
            nothing leaves your device without asking.
          </p>
          <div className="hero-actions">
            <button className="btn-cta" onClick={() => navigate('/dashboard')}>
              Start building
            </button>
            <span className="hero-note">Takes about ten minutes</span>
          </div>
        </div>
        <HeroPaper />
      </main>

      <section className="landing-features" aria-label="Features">
        {FEATURES.map(f => (
          <div key={f.title} className="feature">
            <f.icon size={18} strokeWidth={1.75} className="feature-icon" />
            <h3 className="feature-title">{f.title}</h3>
            <p className="feature-desc">{f.desc}</p>
          </div>
        ))}
      </section>

      <footer className="landing-footer">
        <a
          href="https://services.onetcenter.org/"
          title="This application incorporates information from O*NET Web Services. Click to learn more."
          target="_blank"
          rel="noreferrer"
        >
          <img
            src="/onet/onet-in-it-transparent.svg"
            style={{ width: 130, height: 60, border: 'none' }}
            alt="O*NET in-it"
          />
        </a>
        <p className="onet-credit">
          This application incorporates information from{' '}
          <a href="https://services.onetcenter.org/" target="_blank" rel="noreferrer">O*NET Web Services</a>{' '}
          by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA).
          O*NET® is a trademark of USDOL/ETA.
        </p>
      </footer>
    </div>
  )
}
