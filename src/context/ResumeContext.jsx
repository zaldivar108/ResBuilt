import { createContext, useContext, useState, useEffect } from 'react'
import { STARTERS, DEFAULT_STARTER_ID } from '../config/starters'

const ResumeContext = createContext(null)

function genId() {
  return Math.random().toString(36).slice(2, 9)
}

function defaultStyles() {
  return {
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
  }
}

function createNewResume(title = 'Untitled Resume', starterId = DEFAULT_STARTER_ID) {
  const starter = STARTERS[starterId] ?? STARTERS[DEFAULT_STARTER_ID]
  return {
    id: genId(),
    title,
    lastEdited: new Date().toISOString(),
    sections: starter.sections.map(s => ({ ...s, id: genId() })),
    styles: defaultStyles(),
  }
}

// Build a resume from imported sections (from a PDF). Fills content only —
// the visual template stays the defaulted Classic layout, not a starter.
function createImportedResume(title, sections) {
  return {
    id: genId(),
    title,
    lastEdited: new Date().toISOString(),
    sections: sections.map(s => ({ ...s, id: genId() })),
    styles: defaultStyles(),
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

  function createResume(title, starterId) {
    const resume = createNewResume(title, starterId)
    setResumes(prev => [resume, ...prev])
    return resume
  }

  function createResumeFromImport(title, sections) {
    const resume = createImportedResume(title, sections)
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
      createResume, createResumeFromImport, updateResume, deleteResume, duplicateResume, getResume,
      darkMode, setDarkMode,
    }}>
      {children}
    </ResumeContext.Provider>
  )
}

export function useResume() {
  return useContext(ResumeContext)
}
