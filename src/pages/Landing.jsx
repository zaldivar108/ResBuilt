import { useNavigate } from 'react-router-dom'
import { useResume } from '../context/ResumeContext'
import './Landing.css'

export default function Landing() {
  const navigate = useNavigate()
  const { user } = useResume()

  function handleCTA() {
    navigate(user ? '/dashboard' : '/login')
  }

  return (
    <div className="landing">
      <div className="landing-orbs">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <nav className="landing-nav">
        <span className="landing-logo">ResBuilt</span>
        <div className="landing-nav-actions">
          {user ? (
            <button className="btn-nav" onClick={() => navigate('/dashboard')}>Dashboard</button>
          ) : (
            <>
              <button className="btn-nav-ghost" onClick={() => navigate('/login')}>Log in</button>
              <button className="btn-nav" onClick={() => navigate('/login')}>Get started</button>
            </>
          )}
        </div>
      </nav>

      <main className="landing-hero">
        <div className="hero-badge">✦ Free to use, forever</div>

        <h1 className="hero-title">
          Resume Builder<br />
          <span className="hero-title-accent">made simple.</span>
        </h1>

        <p className="hero-subtitle">
          Create stunning, professional resumes in minutes.<br />
          Stand out from the crowd with ResBuilt.
        </p>

        <div className="hero-actions">
          <button className="btn-cta" onClick={handleCTA}>
            Start Building →
          </button>
          <span className="hero-note">No credit card required</span>
        </div>

        <div className="hero-features">
          {[
            { icon: '⚡', label: 'Fast editor' },
            { icon: '🎨', label: 'Beautiful layouts' },
            { icon: '📄', label: 'Print-ready' },
            { icon: '☁️', label: 'Auto-saved' },
          ].map(f => (
            <div key={f.label} className="hero-feature">
              <span>{f.icon}</span>
              <span>{f.label}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
