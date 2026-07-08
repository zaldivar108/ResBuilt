// On-device, whole-résumé review heuristics (ADR 0002 / issue 001). Pure
// functions over the sections array — zero network, zero AI-budget cost.
// Findings are suggestions only; never auto-fixed. False positives are
// expected (e.g. tense detection on an unusual verb) and acceptable.

const BULLET_SECTION_TYPES = new Set(['experience', 'projects', 'activities', 'volunteer'])
const OBJECTIVE_SECTION_TYPES = new Set(['summary'])
const SKILLS_SECTION_TYPES = new Set(['skills'])

// Filler phrases that say nothing a reader can act on — flagged so a
// first-time writer replaces them with something specific.
const GENERIC_PHRASES = [
  'hardworking', 'team player', 'detail-oriented', 'detail oriented',
  'results-driven', 'results driven', 'go-getter', 'self-starter',
  'self starter', 'people person', 'think outside the box', 'fast learner',
]

// Curated base/past pairs for common first-résumé bullet verbs. Anything
// outside this list is left unclassified rather than guessed at.
const VERB_PAIRS = [
  ['lead', 'led'], ['manage', 'managed'], ['organize', 'organized'],
  ['assist', 'assisted'], ['help', 'helped'], ['create', 'created'],
  ['develop', 'developed'], ['train', 'trained'], ['coordinate', 'coordinated'],
  ['support', 'supported'], ['handle', 'handled'], ['build', 'built'],
  ['teach', 'taught'], ['write', 'wrote'], ['run', 'ran'], ['plan', 'planned'],
  ['serve', 'served'], ['greet', 'greeted'], ['clean', 'cleaned'],
]
const BASE_VERBS = new Set(VERB_PAIRS.map(([base]) => base))
const PAST_VERBS = new Set(VERB_PAIRS.map(([, past]) => past))

// Rough chars-per-page for a typical résumé body; a heuristic ceiling, not a
// layout measurement (the editor's own overflow check does that precisely).
const PAGE_CHAR_BUDGET = 3000

/**
 * Plain text from a section's HTML content. Exported for reuse by anything
 * that needs the same text (e.g. resumeReview.js's AI-review payload).
 * @param {string} html
 * @returns {string}
 */
export function htmlToText(html) {
  if (typeof html !== 'string' || !html) return ''
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  return doc.body.textContent || ''
}

function extractBullets(html) {
  if (typeof html !== 'string' || !html) return []
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  return Array.from(doc.body.querySelectorAll('li')).map(li => li.textContent || '')
}

function classifyTense(firstWord) {
  const word = firstWord.toLowerCase()
  if (PAST_VERBS.has(word)) return 'past'
  if (BASE_VERBS.has(word)) return 'present'
  if (/ed$/.test(word)) return 'past'
  return null
}

function visibleSections(sections) {
  return Array.isArray(sections) ? sections.filter(s => s && !s.hidden) : []
}

function checkNumberlessBullets(section) {
  if (!BULLET_SECTION_TYPES.has(section.type)) return null
  const bullets = extractBullets(section.content)
  if (bullets.length === 0) return null
  if (bullets.some(b => /\d/.test(b))) return null
  return {
    heuristic: 'numberless-bullets',
    sectionId: section.id,
    sectionTitle: section.title,
    message: `None of the bullets in "${section.title}" include a number. Adding one (hours, people, dollars, %) makes the impact concrete.`,
  }
}

function checkGenericObjective(section) {
  if (!OBJECTIVE_SECTION_TYPES.has(section.type)) return null
  const text = htmlToText(section.content).toLowerCase()
  const hit = GENERIC_PHRASES.find(phrase => text.includes(phrase))
  if (!hit) return null
  return {
    heuristic: 'generic-objective',
    sectionId: section.id,
    sectionTitle: section.title,
    message: `"${section.title}" leans on a generic phrase ("${hit}"). Say what you're actually looking for instead.`,
  }
}

function checkTenseInconsistency(section) {
  if (!BULLET_SECTION_TYPES.has(section.type)) return null
  const bullets = extractBullets(section.content)
  if (bullets.length < 2) return null

  const tenses = new Set()
  for (const bullet of bullets) {
    const firstWord = bullet.trim().split(/\s+/)[0]
    if (!firstWord) continue
    const tense = classifyTense(firstWord)
    if (tense) tenses.add(tense)
  }
  if (tenses.size < 2) return null
  return {
    heuristic: 'tense-inconsistency',
    sectionId: section.id,
    sectionTitle: section.title,
    message: `"${section.title}" mixes past and present tense across bullets. Pick one (past tense is standard) and keep it consistent.`,
  }
}

function checkDuplicateSkills(section) {
  if (!SKILLS_SECTION_TYPES.has(section.type)) return null
  const text = htmlToText(section.content)
  const tokens = text
    .split(/[,|•\n]/)
    .map(t => t.trim().replace(/^[-–—]\s*/, ''))
    .filter(Boolean)

  const seen = new Map()
  const dupes = new Set()
  for (const token of tokens) {
    const key = token.toLowerCase()
    if (seen.has(key)) dupes.add(seen.get(key))
    else seen.set(key, token)
  }
  if (dupes.size === 0) return null
  return {
    heuristic: 'duplicate-skills',
    sectionId: section.id,
    sectionTitle: section.title,
    message: `"${section.title}" lists ${Array.from(dupes).join(', ')} more than once.`,
  }
}

function checkLength(sections) {
  const totalChars = sections.reduce((sum, s) => sum + htmlToText(s.content).length, 0)
  if (totalChars <= PAGE_CHAR_BUDGET) return null
  return {
    heuristic: 'length',
    sectionId: null,
    sectionTitle: null,
    message: `This résumé is estimated to run past one page. For a first résumé, one page is the target — trim the least relevant section.`,
  }
}

/**
 * Evaluate a résumé's sections against on-device heuristics.
 * @param {Array<{ id: string, title: string, type: string, content: string, hidden?: boolean }> | null | undefined} sections
 * @returns {{ findings: Array<{ id: string, heuristic: string, sectionId: string | null, sectionTitle: string | null, message: string }> }}
 */
export function checkResume(sections) {
  const visible = visibleSections(sections)
  const findings = []

  for (const section of visible) {
    const perSection = [
      checkNumberlessBullets(section),
      checkGenericObjective(section),
      checkTenseInconsistency(section),
      checkDuplicateSkills(section),
    ]
    for (const finding of perSection) {
      if (finding) findings.push(finding)
    }
  }

  if (visible.length > 0) {
    const lengthFinding = checkLength(visible)
    if (lengthFinding) findings.push(lengthFinding)
  }

  return {
    findings: findings.map(f => ({ id: `${f.heuristic}:${f.sectionId ?? 'resume'}`, ...f })),
  }
}
