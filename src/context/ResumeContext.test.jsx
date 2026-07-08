import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { ResumeProvider, useResume } from './ResumeContext'
import { DEFAULT_STARTER_ID } from '../config/starters'

function setup() {
  return renderHook(() => useResume(), { wrapper: ResumeProvider })
}

function readStore(key) {
  return JSON.parse(localStorage.getItem(key))
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  document.documentElement.removeAttribute('data-theme')
})

describe('ResumeContext — initial state', () => {
  test('starts with no user and no resumes on a clean device', () => {
    const { result } = setup()
    expect(result.current.user).toBeNull()
    expect(result.current.resumes).toEqual([])
    expect(result.current.darkMode).toBe(false)
  })

  test('hydrates resumes from localStorage', () => {
    const stored = [{ id: 'abc', title: 'Saved', sections: [], styles: {} }]
    localStorage.setItem('resbuilt_resumes', JSON.stringify(stored))
    const { result } = setup()
    expect(result.current.resumes).toEqual(stored)
  })

  test('falls back to empty state when stored JSON is corrupt', () => {
    localStorage.setItem('resbuilt_resumes', '{not valid json')
    localStorage.setItem('resbuilt_user', 'also broken')
    localStorage.setItem('resbuilt_darkmode', 'nope')
    const { result } = setup()
    expect(result.current.resumes).toEqual([])
    expect(result.current.user).toBeNull()
    expect(result.current.darkMode).toBe(false)
  })
})

describe('ResumeContext — createResume', () => {
  test('creates a resume with the default starter and unique ids', () => {
    const { result } = setup()
    let created
    act(() => { created = result.current.createResume('My Resume') })

    expect(created.title).toBe('My Resume')
    expect(created.id).toBeTruthy()
    expect(created.sections.length).toBeGreaterThan(0)
    // every section gets its own id assigned at creation time
    const ids = created.sections.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every(Boolean)).toBe(true)
    expect(created.styles.template).toBe('classic')
    expect(result.current.resumes).toHaveLength(1)
  })

  test('prepends new resumes (newest first)', () => {
    const { result } = setup()
    act(() => { result.current.createResume('First') })
    act(() => { result.current.createResume('Second') })
    expect(result.current.resumes.map(r => r.title)).toEqual(['Second', 'First'])
  })

  test('unknown starter id falls back to default starter', () => {
    const { result } = setup()
    let a, b
    act(() => { a = result.current.createResume('Fallback', 'nonexistent-starter') })
    act(() => { b = result.current.createResume('Default', DEFAULT_STARTER_ID) })
    expect(a.sections.map(s => s.type)).toEqual(b.sections.map(s => s.type))
  })

  test('persists new resume to localStorage', () => {
    const { result } = setup()
    act(() => { result.current.createResume('Persisted') })
    expect(readStore('resbuilt_resumes')).toHaveLength(1)
    expect(readStore('resbuilt_resumes')[0].title).toBe('Persisted')
  })
})

describe('ResumeContext — createResumeFromImport', () => {
  test('builds a resume from imported sections with fresh ids and Classic styles', () => {
    const { result } = setup()
    const imported = [
      { title: 'Contact', type: 'contact', content: '<p>x</p>' },
      { title: 'Experience', type: 'experience', content: '<p>y</p>' },
    ]
    let created
    act(() => { created = result.current.createResumeFromImport('Imported', imported) })

    expect(created.title).toBe('Imported')
    expect(created.sections).toHaveLength(2)
    expect(created.sections.every(s => s.id)).toBe(true)
    expect(created.styles.template).toBe('classic')
    expect(result.current.resumes[0]).toEqual(created)
  })
})

describe('ResumeContext — updateResume', () => {
  test('merges updates and refreshes lastEdited', () => {
    vi.useFakeTimers()
    try {
      const { result } = setup()
      let created
      act(() => { created = result.current.createResume('Before') })
      const originalEdited = created.lastEdited

      vi.advanceTimersByTime(1000) // move the clock so the new timestamp differs
      act(() => { result.current.updateResume(created.id, { title: 'After' }) })
      const updated = result.current.getResume(created.id)
      expect(updated.title).toBe('After')
      expect(updated.lastEdited).not.toBe(originalEdited)
      expect(new Date(updated.lastEdited).getTime()).toBeGreaterThan(new Date(originalEdited).getTime())
      expect(updated.sections).toEqual(created.sections)
    } finally {
      vi.useRealTimers()
    }
  })

  test('does not mutate the original resume object (immutability)', () => {
    const { result } = setup()
    let created
    act(() => { created = result.current.createResume('X') })
    const before = created.title

    act(() => { result.current.updateResume(created.id, { title: 'Y' }) })
    expect(created.title).toBe(before)
  })

  test('leaves other resumes untouched', () => {
    const { result } = setup()
    let a, b
    act(() => { a = result.current.createResume('A') })
    act(() => { b = result.current.createResume('B') })
    act(() => { result.current.updateResume(a.id, { title: 'A2' }) })
    expect(result.current.getResume(b.id).title).toBe('B')
  })
})

describe('ResumeContext — deleteResume', () => {
  test('removes the matching resume only', () => {
    const { result } = setup()
    let a, b
    act(() => { a = result.current.createResume('A') })
    act(() => { b = result.current.createResume('B') })
    act(() => { result.current.deleteResume(a.id) })
    expect(result.current.resumes).toHaveLength(1)
    expect(result.current.getResume(a.id)).toBeNull()
    expect(result.current.getResume(b.id)).toBeTruthy()
  })

  test('is a no-op for an unknown id', () => {
    const { result } = setup()
    act(() => { result.current.createResume('A') })
    act(() => { result.current.deleteResume('does-not-exist') })
    expect(result.current.resumes).toHaveLength(1)
  })
})

describe('ResumeContext — duplicateResume', () => {
  test('deep-copies with a new id and "(Copy)" title', () => {
    const { result } = setup()
    let original
    act(() => { original = result.current.createResume('Original') })
    let copy
    act(() => { copy = result.current.duplicateResume(original.id) })

    expect(copy.id).not.toBe(original.id)
    expect(copy.title).toBe('Original (Copy)')
    expect(copy.sections).toEqual(original.sections)
    // deep copy — editing the copy must not touch the original
    expect(copy.sections).not.toBe(original.sections)
    expect(result.current.resumes[0].id).toBe(copy.id)
  })

  test('returns null for an unknown id', () => {
    const { result } = setup()
    let copy = 'sentinel'
    act(() => { copy = result.current.duplicateResume('nope') })
    expect(copy).toBeNull()
    expect(result.current.resumes).toEqual([])
  })
})

describe('ResumeContext — auth (mock)', () => {
  test('login sets a user and derives name from email when omitted', () => {
    const { result } = setup()
    let u
    act(() => { u = result.current.login('sam@example.com', 'pw') })
    expect(u.email).toBe('sam@example.com')
    expect(u.name).toBe('sam')
    expect(result.current.user).toEqual(u)
    expect(readStore('resbuilt_user')).toEqual(u)
  })

  test('login keeps an explicit name', () => {
    const { result } = setup()
    act(() => { result.current.login('sam@example.com', 'pw', 'Sam Smith') })
    expect(result.current.user.name).toBe('Sam Smith')
  })

  test('logout clears the user', () => {
    const { result } = setup()
    act(() => { result.current.login('a@b.com', 'pw') })
    act(() => { result.current.logout() })
    expect(result.current.user).toBeNull()
  })
})

describe('ResumeContext — dark mode', () => {
  test('setDarkMode toggles state, persists, and stamps data-theme', () => {
    const { result } = setup()
    act(() => { result.current.setDarkMode(true) })
    expect(result.current.darkMode).toBe(true)
    expect(readStore('resbuilt_darkmode')).toBe(true)
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')

    act(() => { result.current.setDarkMode(false) })
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })
})
