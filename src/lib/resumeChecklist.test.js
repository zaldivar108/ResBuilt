import { describe, test, expect } from 'vitest'
import { checkResume } from './resumeChecklist.js'

function section(overrides = {}) {
  return {
    id: 's1',
    title: 'Experience',
    type: 'experience',
    content: '',
    ...overrides,
  }
}

function findingsFor(result, heuristic) {
  return result.findings.filter(f => f.heuristic === heuristic)
}

describe('checkResume — degenerate inputs', () => {
  test('empty section list produces no findings', () => {
    expect(checkResume([])).toEqual({ findings: [] })
  })

  test('null/undefined sections do not throw', () => {
    expect(checkResume(null).findings).toEqual([])
    expect(checkResume(undefined).findings).toEqual([])
  })

  test('hidden sections are excluded from every heuristic', () => {
    const sections = [
      section({
        hidden: true,
        content: '<ul><li>Helped customers</li><li>Organized inventory</li></ul>',
      }),
    ]
    expect(checkResume(sections).findings).toEqual([])
  })

  test('sections with no bullets do not trigger the numberless-bullets check', () => {
    const sections = [section({ type: 'experience', content: '<p>Just a paragraph, no list.</p>' })]
    expect(findingsFor(checkResume(sections), 'numberless-bullets')).toEqual([])
  })
})

describe('numberless bullets', () => {
  test('flags a bullet section where every bullet lacks a number', () => {
    const sections = [
      section({
        content: '<ul><li>Helped customers at the counter</li><li>Organized the stockroom</li></ul>',
      }),
    ]
    const findings = findingsFor(checkResume(sections), 'numberless-bullets')
    expect(findings).toHaveLength(1)
    expect(findings[0].sectionId).toBe('s1')
  })

  test('does not flag when at least one bullet has a number', () => {
    const sections = [
      section({
        content: '<ul><li>Helped customers</li><li>Handled up to 20 orders per hour</li></ul>',
      }),
    ]
    expect(findingsFor(checkResume(sections), 'numberless-bullets')).toEqual([])
  })

  test('only checks bullet-bearing section types (skips education)', () => {
    const sections = [
      section({ type: 'education', content: '<ul><li>Studied biology</li></ul>' }),
    ]
    expect(findingsFor(checkResume(sections), 'numberless-bullets')).toEqual([])
  })
})

describe('generic objective', () => {
  test('flags a summary section containing a generic phrase', () => {
    const sections = [
      section({
        type: 'summary',
        content: '<p>Hardworking and reliable student looking for a role.</p>',
      }),
    ]
    const findings = findingsFor(checkResume(sections), 'generic-objective')
    expect(findings).toHaveLength(1)
    expect(findings[0].sectionId).toBe('s1')
  })

  test('does not flag a specific, non-generic objective', () => {
    const sections = [
      section({
        type: 'summary',
        content: '<p>Junior studying computer science, seeking a summer front-end internship.</p>',
      }),
    ]
    expect(findingsFor(checkResume(sections), 'generic-objective')).toEqual([])
  })
})

describe('tense inconsistency', () => {
  test('flags mixed past/present bullet verbs in the same section', () => {
    const sections = [
      section({
        content: '<ul><li>Led the weekend crew</li><li>Manage inventory counts</li></ul>',
      }),
    ]
    const findings = findingsFor(checkResume(sections), 'tense-inconsistency')
    expect(findings).toHaveLength(1)
  })

  test('does not flag consistent past tense', () => {
    const sections = [
      section({
        content: '<ul><li>Led the weekend crew</li><li>Organized the stockroom</li><li>Built a new schedule</li></ul>',
      }),
    ]
    expect(findingsFor(checkResume(sections), 'tense-inconsistency')).toEqual([])
  })

  test('a single bullet cannot be inconsistent', () => {
    const sections = [section({ content: '<ul><li>Led the weekend crew</li></ul>' })]
    expect(findingsFor(checkResume(sections), 'tense-inconsistency')).toEqual([])
  })
})

describe('duplicate skills', () => {
  test('flags a case-insensitive duplicate skill', () => {
    const sections = [
      section({
        id: 's2',
        type: 'skills',
        content: '<p>JavaScript, Excel, javascript, Canva</p>',
      }),
    ]
    const findings = findingsFor(checkResume(sections), 'duplicate-skills')
    expect(findings).toHaveLength(1)
    expect(findings[0].message.toLowerCase()).toContain('javascript')
  })

  test('does not flag distinct skills', () => {
    const sections = [
      section({ id: 's2', type: 'skills', content: '<p>JavaScript, Excel, Canva</p>' }),
    ]
    expect(findingsFor(checkResume(sections), 'duplicate-skills')).toEqual([])
  })
})

describe('length vs one page', () => {
  test('flags a résumé estimated to run past one page', () => {
    const longBullet = '<li>' + 'Delivered consistent results for the team. '.repeat(80) + '</li>'
    const sections = [section({ content: `<ul>${longBullet}</ul>` })]
    const findings = findingsFor(checkResume(sections), 'length')
    expect(findings).toHaveLength(1)
    expect(findings[0].sectionId).toBeNull()
  })

  test('does not flag a short résumé', () => {
    const sections = [section({ content: '<ul><li>Helped run the front counter</li></ul>' })]
    expect(findingsFor(checkResume(sections), 'length')).toEqual([])
  })
})

describe('finding shape', () => {
  test('every finding has a stable id, heuristic, and message', () => {
    const sections = [
      section({
        type: 'summary',
        content: '<p>Hardworking team player.</p>',
      }),
    ]
    const [finding] = checkResume(sections).findings
    expect(finding.id).toEqual(expect.any(String))
    expect(finding.heuristic).toBe('generic-objective')
    expect(finding.message).toEqual(expect.any(String))
    expect(finding.message.length).toBeGreaterThan(0)
  })
})
