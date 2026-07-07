import { useNavigate } from 'react-router-dom'
import { useResume } from '../context/ResumeContext'
import { APP_VERSION } from '../version'
import './Landing.css'

export default function Landing() {
  const navigate = useNavigate()
  const { resumes } = useResume()

  function handleCTA() {
    navigate('/dashboard')
  }

  return (
    <div className="landing">
      <div className="landing-orbs">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <nav className="landing-nav">
        <span className="landing-brand">
          <span className="landing-logo">ResBuilt</span>
          <span className="landing-version">v{APP_VERSION}</span>
        </span>
        <div className="landing-nav-actions">
          <button className="btn-nav" onClick={() => navigate('/dashboard')}>
            {resumes.length > 0 ? 'My Resumes' : 'Get started'}
          </button>
        </div>
      </nav>

      <main className="landing-hero">
        <div className="hero-badge">✦ Free to use, forever</div>

        <h1 className="hero-title">
          Resume Builder<br />
          <span className="hero-title-accent">made simple.</span>
        </h1>

        <p className="hero-subtitle">
          Build your first resume in minutes — for school, part-time jobs,<br />
          internships, and college applications. Free, always.
        </p>

        <div className="hero-actions">
          <button className="btn-cta" onClick={handleCTA}>
            Start Building →
          </button>
          <span className="hero-note">No account needed · nothing to sign up for</span>
        </div>

        <div className="hero-features">
          {[
            { icon: '⚡', label: 'Fast editor' },
            { icon: '🎨', label: 'Beautiful layouts' },
            { icon: '📄', label: 'Print-ready' },
            { icon: '🔒', label: 'Stays on your device' },
          ].map(f => (
            <div key={f.label} className="hero-feature">
              <span>{f.icon}</span>
              <span>{f.label}</span>
            </div>
          ))}
        </div>
      </main>

      <footer className="landing-footer">
        <a
          href="https://services.onetcenter.org/"
          title="This application incorporates information from O*NET Web Services. Click to learn more."
          target="_blank"
          rel="noreferrer"
        >
          <img
            src="/onet/onet-in-it.svg"
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
