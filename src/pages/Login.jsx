import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useResume } from '../context/ResumeContext'
import './Login.css'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useResume()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Please fill in all fields.'); return }
    if (mode === 'signup' && !name) { setError('Please enter your name.'); return }
    login(email, password, name)
    navigate('/dashboard')
  }

  function toggleMode() {
    setMode(m => m === 'login' ? 'signup' : 'login')
    setError('')
  }

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
      </div>

      <div className="login-card">
        <button className="login-logo" onClick={() => navigate('/')}>ResBuilt</button>

        <h1 className="login-title">
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h1>
        <p className="login-subtitle">
          {mode === 'login'
            ? 'Sign in to continue building'
            : 'Start building your resume today'}
        </p>

        <form className="login-form" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Jane Smith"
                autoComplete="name"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="jane@example.com"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="login-submit">
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="login-switch">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button type="button" onClick={toggleMode}>
            {mode === 'login' ? 'Create one' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
