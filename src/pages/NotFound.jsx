import { useNavigate } from 'react-router-dom'
import { useResume } from '../context/ResumeContext'
import './NotFound.css'

const links = [
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width={22} height={22}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
    title: 'Dashboard',
    desc: 'View and manage all your resumes in one place.',
    to: '/dashboard',
    label: 'Go to Dashboard',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width={22} height={22}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
    title: 'Create Resume',
    desc: 'Start building a new resume from one of our templates.',
    to: '/dashboard',
    label: 'Get started',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width={22} height={22}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
    title: 'Home',
    desc: 'Head back to the ResBuilt landing page.',
    to: '/',
    label: 'Go home',
  },
]

export default function NotFound() {
  const navigate = useNavigate()
  const { darkMode } = useResume()

  return (
    <main className={`nf-root${darkMode ? ' dark' : ''}`}>
      <div className="nf-container">
        <span className="nf-logo" onClick={() => navigate('/')}>ResBuilt</span>
        <div className="nf-hero">
          <span className="nf-badge">404 Error</span>
          <h1 className="nf-heading">Page not found</h1>
          <p className="nf-desc">
            Sorry, the page you're looking for could not be found or has been removed.
          </p>
        </div>
        <ul className="nf-list">
          {links.map(item => (
            <li key={item.title} className="nf-item">
              <div className="nf-icon-wrap">{item.icon}</div>
              <div className="nf-item-body">
                <h4 className="nf-item-title">{item.title}</h4>
                <p className="nf-item-desc">{item.desc}</p>
                <button className="nf-link" onClick={() => navigate(item.to)}>
                  {item.label}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width={16} height={16}>
                    <path fillRule="evenodd" d="M5 10a.75.75 0 01.75-.75h6.638L10.23 7.29a.75.75 0 111.04-1.08l3.5 3.25a.75.75 0 010 1.08l-3.5 3.25a.75.75 0 11-1.04-1.08l2.158-1.96H5.75A.75.75 0 015 10z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
