// Auto-suggest an O*NET grounding occupation for "Suggest ideas" (ADR 0005) —
// never auto-applied; the caller always renders this as a one-click chip the
// user can accept or dismiss. Zero AI cost: seed/proxy occupation search only.
//
// Precedence (explicit intent beats guessing):
//   1. resume.targetJob (issue 004) — the user's own pasted/quiz-picked job.
//      Quiz-seeded résumés (careerSeed.js) don't carry a separate field for
//      their career; it shows up in the résumé title ("Barista Resume"),
//      which step 2 already covers, so no extra plumbing is needed for that case.
//   2. The résumé title, with filler words stripped.
//   3. The summary/objective section's text.
// Returns null the moment a source has candidate words but none match — it
// never falls through to a weaker source once a specific-enough attempt was
// made, matching "no-match → no suggestion" rather than a wrong guess.

import { searchOccupations } from './onet'
import { htmlToText } from './resumeChecklist'

const FILLER_WORDS = new Set([
  'resume', 'résumé', 'cv', 'my', 'a', 'an', 'the', 'for', 'of', 'to', 'in', 'on', 'at',
  'is', 'me', 'i', 'with', 'as', 'looking', 'seeking', 'role', 'position', 'job', 'work',
])

function candidateWords(text) {
  return (text ?? '')
    .toLowerCase()
    .split(/[^a-z0-9&]+/i)
    .map(w => w.trim())
    .filter(w => w.length >= 3 && !FILLER_WORDS.has(w))
}

function firstMatch(candidates, searchFn) {
  for (const word of candidates) {
    const hits = searchFn(word)
    if (hits?.length) return hits[0]
  }
  return null
}

function visibleSummary(sections) {
  return (sections ?? []).find(s => s && s.type === 'summary' && !s.hidden) ?? null
}

/**
 * @param {{ title?: string, targetJob?: { text?: string, title?: string } | null, sections?: Array }} resume
 * @param {{ searchFn?: (query: string) => Array<{ code: string, title: string }> }} [opts]
 * @returns {{ code: string, title: string, source: 'targetJob' | 'title' | 'objective' } | null}
 */
export function suggestGroundingOccupation(resume, { searchFn = searchOccupations } = {}) {
  if (!resume) return null

  if (resume.targetJob) {
    const candidates = resume.targetJob.title
      ? [resume.targetJob.title, ...candidateWords(resume.targetJob.title)]
      : candidateWords(resume.targetJob.text)
    const hit = firstMatch(candidates, searchFn)
    if (hit) return { ...hit, source: 'targetJob' }
  }

  const titleHit = firstMatch(candidateWords(resume.title), searchFn)
  if (titleHit) return { ...titleHit, source: 'title' }

  const summary = visibleSummary(resume.sections)
  if (summary) {
    const objectiveHit = firstMatch(candidateWords(htmlToText(summary.content)), searchFn)
    if (objectiveHit) return { ...objectiveHit, source: 'objective' }
  }

  return null
}
