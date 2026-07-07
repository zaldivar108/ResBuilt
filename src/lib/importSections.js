// Normalize the AI proxy's `import` response into resume sections.
//
// Never trust external data: the model returns JSON, but we still validate the
// shape, coerce every field, drop junk, and enforce the "exactly one contact,
// first" invariant here — the server prompt asks for it, the client guarantees
// it. Pure function, no React/DOM, so the rules are easy to test.

/** Section types the app knows how to lay out. Anything else → 'custom'. */
export const KNOWN_SECTION_TYPES = [
  'contact',
  'summary',
  'education',
  'experience',
  'skills',
  'projects',
  'certifications',
  'activities',
  'volunteer',
  'awards',
  'availability',
  'custom',
]

// Human labels used when the model omits a title.
const TYPE_LABELS = {
  contact: 'Contact',
  summary: 'Summary',
  education: 'Education',
  experience: 'Experience',
  skills: 'Skills',
  projects: 'Projects',
  certifications: 'Certifications',
  activities: 'Activities',
  volunteer: 'Volunteer',
  awards: 'Awards',
  availability: 'Availability',
  custom: 'Section',
}

function genId() {
  return Math.random().toString(36).slice(2, 9)
}

// The model runs in JSON mode, but be defensive: strip a ```json fence if one
// slips through, then parse.
function coerceToObject(raw) {
  if (raw && typeof raw === 'object') return raw
  if (typeof raw !== 'string') return null
  const unfenced = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  try {
    return JSON.parse(unfenced)
  } catch {
    return null
  }
}

function normalizeType(type) {
  return KNOWN_SECTION_TYPES.includes(type) ? type : 'custom'
}

function normalizeOne(section) {
  if (!section || typeof section !== 'object') return null
  const type = normalizeType(section.type)
  const content = typeof section.content === 'string' ? section.content : ''
  const rawTitle = typeof section.title === 'string' ? section.title.trim() : ''
  const title = rawTitle || TYPE_LABELS[type]
  // Drop sections with no real content and only a fallback title.
  if (!content.trim() && !rawTitle) return null
  return { id: genId(), title, type, content }
}

// Enforce: exactly one contact section, positioned first. Extra contacts are
// demoted to custom (their content is kept, just relabeled).
function enforceContactRule(sections) {
  let seenContact = false
  const remapped = sections.map(s => {
    if (s.type !== 'contact') return s
    if (seenContact) {
      return { ...s, type: 'custom', title: s.title === 'Contact' ? 'Section' : s.title }
    }
    seenContact = true
    return s
  })
  const contactIndex = remapped.findIndex(s => s.type === 'contact')
  if (contactIndex > 0) {
    const [contactSection] = remapped.splice(contactIndex, 1)
    remapped.unshift(contactSection)
  }
  return remapped
}

/**
 * @param {unknown} raw - the AI `import` response (object or JSON string)
 * @returns {{ ok: true, sections: Array<{id,title,type,content}> } | { ok: false, error: string }}
 */
export function normalizeImportedSections(raw) {
  const obj = coerceToObject(raw)
  if (!obj || typeof obj !== 'object' || !Array.isArray(obj.sections)) {
    return { ok: false, error: 'We couldn’t read the résumé structure from that PDF. Please try again.' }
  }
  if (obj.sections.length === 0) {
    return { ok: false, error: 'No résumé content was found in that PDF.' }
  }

  const normalized = obj.sections.map(normalizeOne).filter(Boolean)
  if (normalized.length === 0) {
    return { ok: false, error: 'No usable résumé content was found in that PDF.' }
  }

  return { ok: true, sections: enforceContactRule(normalized) }
}
