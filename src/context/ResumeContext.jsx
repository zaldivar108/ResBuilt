import { createContext, useContext, useState, useEffect } from 'react'

const ResumeContext = createContext(null)

function genId() {
  return Math.random().toString(36).slice(2, 9)
}

const DEFAULT_SECTIONS = [
  {
    title: 'Contact Information',
    type: 'contact',
    content: '<p><strong>Your Name</strong></p><p>email@example.com &nbsp;|&nbsp; (555) 000-0000 &nbsp;|&nbsp; City, State</p><p>linkedin.com/in/yourname &nbsp;|&nbsp; github.com/yourname</p>',
  },
  {
    title: 'Professional Summary',
    type: 'summary',
    content: '<p>Motivated professional with X years of experience in [field]. Proven track record of [achievement]. Seeking to leverage skills in [goal].</p>',
  },
  {
    title: 'Work Experience',
    type: 'experience',
    content: '<p><strong>Job Title</strong> &mdash; Company Name</p><p><em>Jan 2022 &ndash; Present &nbsp;|&nbsp; City, State</em></p><ul><li>Accomplished [X] by doing [Y], resulting in [Z]</li><li>Led team of N to deliver project on time and under budget</li><li>Increased [metric] by X% through [initiative]</li></ul>',
  },
  {
    title: 'Education',
    type: 'education',
    content: '<p><strong>Bachelor of Science in Computer Science</strong></p><p>University Name &nbsp;|&nbsp; Graduated May 2021</p><p>GPA: 3.8 / 4.0 &nbsp;&mdash;&nbsp; Dean\'s List</p>',
  },
  {
    title: 'Skills',
    type: 'skills',
    content: '<p><strong>Languages:</strong> JavaScript, Python, TypeScript, Java</p><p><strong>Frameworks:</strong> React, Node.js, Express, Django</p><p><strong>Tools:</strong> Git, Docker, AWS, PostgreSQL</p>',
  },
  {
    title: 'Projects',
    type: 'projects',
    content: '<p><strong>Project Name</strong> &nbsp;|&nbsp; <em>React, Node.js, MongoDB</em></p><ul><li>Built a full-stack application that [description of impact]</li><li>Implemented [feature] reducing load time by X%</li></ul>',
  },
  {
    title: 'Certifications',
    type: 'certifications',
    content: '<p><strong>AWS Certified Solutions Architect</strong> &mdash; Amazon Web Services &nbsp;|&nbsp; 2023</p><p><strong>Google Professional Cloud Developer</strong> &mdash; Google &nbsp;|&nbsp; 2022</p>',
  },
]

function createNewResume(title = 'Untitled Resume') {
  return {
    id: genId(),
    title,
    lastEdited: new Date().toISOString(),
    sections: DEFAULT_SECTIONS.map(s => ({ ...s, id: genId() })),
    styles: {
      fontFamily: 'Georgia, serif',
      fontSize: 11,
      lineSpacing: 1.5,
      sectionSpacing: 14,
      marginTop: 54,
      marginBottom: 54,
      marginLeft: 54,
      marginRight: 54,
      paperSize: 'letter',
      template: 'classic',
      accentColor: '#1E293B',
    },
  }
}

export function ResumeProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('resbuilt_user')) } catch { return null }
  })
  const [resumes, setResumes] = useState(() => {
    try { return JSON.parse(localStorage.getItem('resbuilt_resumes')) || [] } catch { return [] }
  })
  const [darkMode, setDarkMode] = useState(() => {
    try { return JSON.parse(localStorage.getItem('resbuilt_darkmode')) || false } catch { return false }
  })

  useEffect(() => {
    localStorage.setItem('resbuilt_user', JSON.stringify(user))
  }, [user])

  useEffect(() => {
    localStorage.setItem('resbuilt_resumes', JSON.stringify(resumes))
  }, [resumes])

  useEffect(() => {
    localStorage.setItem('resbuilt_darkmode', JSON.stringify(darkMode))
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  function login(email, _password, name) {
    const u = { id: genId(), email, name: name || email.split('@')[0] }
    setUser(u)
    return u
  }

  function logout() {
    setUser(null)
  }

  function createResume(title) {
    const resume = createNewResume(title)
    setResumes(prev => [resume, ...prev])
    return resume
  }

  function updateResume(id, updates) {
    setResumes(prev =>
      prev.map(r => r.id === id ? { ...r, ...updates, lastEdited: new Date().toISOString() } : r)
    )
  }

  function deleteResume(id) {
    setResumes(prev => prev.filter(r => r.id !== id))
  }

  function duplicateResume(id) {
    const original = resumes.find(r => r.id === id)
    if (!original) return null
    const copy = {
      ...JSON.parse(JSON.stringify(original)),
      id: genId(),
      title: original.title + ' (Copy)',
      lastEdited: new Date().toISOString(),
    }
    setResumes(prev => [copy, ...prev])
    return copy
  }

  function getResume(id) {
    return resumes.find(r => r.id === id) ?? null
  }

  return (
    <ResumeContext.Provider value={{
      user, resumes,
      login, logout,
      createResume, updateResume, deleteResume, duplicateResume, getResume,
      darkMode, setDarkMode,
    }}>
      {children}
    </ResumeContext.Provider>
  )
}

export function useResume() {
  return useContext(ResumeContext)
}
