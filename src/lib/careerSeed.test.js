import { describe, it, expect, vi } from 'vitest'
import { seedSectionsFromOccupation, fetchOccupationForCareer, MAX_SEED_TASKS } from './careerSeed'

const STARTER = [
  { title: 'Contact Information', type: 'contact', content: '<p>you@example.com</p>' },
  { title: 'Objective', type: 'summary', content: '<p>Hardworking student.</p>' },
  { title: 'Experience', type: 'experience', content: '<p><strong>Role</strong></p><ul><li>Describe what you did</li></ul>' },
  { title: 'Skills', type: 'skills', content: '<p><strong>Strengths:</strong> teamwork</p>' },
]

const OCC = {
  code: '35-3023.01',
  title: 'Baristas',
  tasks: ['Prepare and serve coffee.', 'Take customer orders.', 'Clean equipment.'],
  skills: ['Service Orientation', 'Active Listening'],
}

describe('seedSectionsFromOccupation', () => {
  it('returns sections unchanged when occupation is null', () => {
    expect(seedSectionsFromOccupation(STARTER, null)).toEqual(STARTER)
  })

  it('returns sections unchanged when occupation has no tasks', () => {
    expect(seedSectionsFromOccupation(STARTER, { title: 'Clerk', tasks: [], skills: [] })).toEqual(STARTER)
    expect(seedSectionsFromOccupation(STARTER, { title: 'Clerk' })).toEqual(STARTER)
  })

  it('does not mutate the input sections', () => {
    const before = JSON.parse(JSON.stringify(STARTER))
    seedSectionsFromOccupation(STARTER, OCC)
    expect(STARTER).toEqual(before)
  })

  it('appends real duties to the experience section, keeping the starter guidance', () => {
    const out = seedSectionsFromOccupation(STARTER, OCC)
    const exp = out.find(s => s.type === 'experience')
    expect(exp.content.startsWith('<p><strong>Role</strong>')).toBe(true)
    expect(exp.content).toContain('Baristas')
    expect(exp.content).toContain('<li>Prepare and serve coffee.</li>')
    expect(exp.content).toContain('<li>Clean equipment.</li>')
  })

  it('appends occupation skills to the skills section', () => {
    const out = seedSectionsFromOccupation(STARTER, OCC)
    const skills = out.find(s => s.type === 'skills')
    expect(skills.content.startsWith('<p><strong>Strengths:</strong>')).toBe(true)
    expect(skills.content).toContain('Service Orientation, Active Listening')
  })

  it('leaves skills untouched when the occupation has none (live API records)', () => {
    const out = seedSectionsFromOccupation(STARTER, { ...OCC, skills: [] })
    expect(out.find(s => s.type === 'skills')).toEqual(STARTER[3])
  })

  it('leaves unrelated sections untouched', () => {
    const out = seedSectionsFromOccupation(STARTER, OCC)
    expect(out.find(s => s.type === 'contact')).toEqual(STARTER[0])
    expect(out.find(s => s.type === 'summary')).toEqual(STARTER[1])
  })

  it('caps seeded duties at MAX_SEED_TASKS', () => {
    const many = { ...OCC, tasks: Array.from({ length: 15 }, (_, i) => `Task ${i + 1}.`) }
    const exp = seedSectionsFromOccupation(STARTER, many).find(s => s.type === 'experience')
    const count = (exp.content.match(/<li>Task /g) ?? []).length
    expect(count).toBe(MAX_SEED_TASKS)
  })

  it('HTML-escapes duties, skills, and the occupation title', () => {
    const evil = {
      title: 'Cooks <script>alert(1)</script> & Bakers',
      tasks: ['Use <img src=x onerror=alert(1)> ovens.'],
      skills: ['<b>Knife</b> skills'],
    }
    const out = seedSectionsFromOccupation(STARTER, evil)
    const html = out.map(s => s.content).join('')
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('<b>Knife</b>')
    expect(html).toContain('&amp; Bakers')
  })

  it('degrades gracefully when there is no experience section', () => {
    const noExp = STARTER.filter(s => s.type !== 'experience')
    const out = seedSectionsFromOccupation(noExp, OCC)
    expect(out.find(s => s.type === 'skills').content).toContain('Service Orientation')
    expect(out).toHaveLength(noExp.length)
  })
})

describe('fetchOccupationForCareer', () => {
  const career = { code: '35-3023.01', title: 'Baristas' }

  it('returns the remote record when the proxy answers', async () => {
    const getRemote = vi.fn().mockResolvedValue(OCC)
    const occ = await fetchOccupationForCareer(career, { getRemote, getLocal: vi.fn() })
    expect(occ).toEqual(OCC)
    expect(getRemote).toHaveBeenCalledWith(career.code, career.title)
  })

  it('falls back to the bundled seed when the proxy rejects', async () => {
    const getRemote = vi.fn().mockRejectedValue(new Error('offline'))
    const getLocal = vi.fn().mockReturnValue(OCC)
    const occ = await fetchOccupationForCareer(career, { getRemote, getLocal })
    expect(occ).toEqual(OCC)
    expect(getLocal).toHaveBeenCalledWith(career.code)
  })

  it('falls back to the seed when the proxy is slower than the timeout', async () => {
    const getRemote = vi.fn(() => new Promise(() => {})) // never settles
    const getLocal = vi.fn().mockReturnValue(OCC)
    const occ = await fetchOccupationForCareer(career, { getRemote, getLocal, timeoutMs: 10 })
    expect(occ).toEqual(OCC)
  })

  it('returns null when both remote and seed miss (title-only degrade)', async () => {
    const getRemote = vi.fn().mockResolvedValue(null)
    const getLocal = vi.fn().mockReturnValue(null)
    expect(await fetchOccupationForCareer(career, { getRemote, getLocal })).toBeNull()
  })
})
