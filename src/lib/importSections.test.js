import { describe, test, expect } from 'vitest'
import { KNOWN_SECTION_TYPES, normalizeImportedSections } from './importSections.js'

const contact = { title: 'Contact', type: 'contact', content: '<p>Jane Doe</p>' }
const exp = { title: 'Experience', type: 'experience', content: '<ul><li>Cashier</li></ul>' }

function ok(raw) {
  const r = normalizeImportedSections(raw)
  expect(r.ok).toBe(true)
  return r.sections
}

describe('normalizeImportedSections — happy path', () => {
  test('normalizes a well-formed object', () => {
    const sections = ok({ sections: [contact, exp] })
    expect(sections).toHaveLength(2)
    expect(sections[0]).toMatchObject({ title: 'Contact', type: 'contact', content: '<p>Jane Doe</p>' })
    expect(sections[1].type).toBe('experience')
  })

  test('assigns a unique non-empty id to every section', () => {
    const sections = ok({ sections: [contact, exp] })
    const ids = sections.map(s => s.id)
    expect(ids.every(id => typeof id === 'string' && id.length > 0)).toBe(true)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('parses a raw JSON string', () => {
    const sections = ok(JSON.stringify({ sections: [contact, exp] }))
    expect(sections).toHaveLength(2)
  })

  test('tolerates a ```json fenced string from the model', () => {
    const fenced = '```json\n' + JSON.stringify({ sections: [contact] }) + '\n```'
    expect(ok(fenced)).toHaveLength(1)
  })
})

describe('normalizeImportedSections — per-section coercion', () => {
  test('maps an unknown type to custom', () => {
    const [s] = ok({ sections: [{ title: 'Hobbies', type: 'hobbies', content: '<p>Chess</p>' }] })
    expect(s.type).toBe('custom')
    expect(KNOWN_SECTION_TYPES).not.toContain('hobbies')
  })

  test('fills a missing title with a label derived from the type', () => {
    const [s] = ok({ sections: [{ type: 'experience', content: '<p>x</p>' }] })
    expect(s.title).toBe('Experience')
  })

  test('coerces non-string content to an empty string', () => {
    const [s] = ok({ sections: [{ title: 'Skills', type: 'skills', content: { junk: true } }] })
    expect(s.content).toBe('')
  })

  test('drops sections that are entirely empty', () => {
    const sections = ok({ sections: [contact, { title: '', type: 'custom', content: '' }] })
    expect(sections).toHaveLength(1)
  })
})

describe('normalizeImportedSections — contact rules', () => {
  test('moves the contact section to the front', () => {
    const sections = ok({ sections: [exp, contact] })
    expect(sections[0].type).toBe('contact')
    expect(sections[1].type).toBe('experience')
  })

  test('keeps only the first contact, demoting extras to custom', () => {
    const second = { title: 'Contact 2', type: 'contact', content: '<p>dup</p>' }
    const sections = ok({ sections: [contact, second, exp] })
    const contacts = sections.filter(s => s.type === 'contact')
    expect(contacts).toHaveLength(1)
    expect(sections[0].type).toBe('contact')
    expect(sections.some(s => s.content === '<p>dup</p>' && s.type === 'custom')).toBe(true)
  })
})

describe('normalizeImportedSections — rejection', () => {
  test.each([
    ['null', null],
    ['undefined', undefined],
    ['a number', 42],
    ['missing sections key', { foo: 'bar' }],
    ['sections not an array', { sections: 'nope' }],
    ['empty sections array', { sections: [] }],
    ['unparseable string', 'not json at all {{{'],
    ['all sections empty', { sections: [{ title: '', type: 'custom', content: '' }] }],
  ])('rejects %s', (_label, raw) => {
    const r = normalizeImportedSections(raw)
    expect(r.ok).toBe(false)
    expect(typeof r.error).toBe('string')
  })
})
