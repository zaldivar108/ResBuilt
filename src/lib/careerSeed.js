// Seed a starter résumé's sections with real O*NET occupation data, so a
// résumé started from the Interest Profiler ("Start a résumé →" on a matched
// career) opens with the career's actual duties instead of generic
// placeholders. Pure — callers fetch the occupation record themselves.
//
// Duties are framed as *ideas to adapt*, never as claimed experience: this app
// is for first-résumé writers and must not put words in their mouth.

import { bulletsFromTasks, escapeHtml, getOccupation, getOccupationRemote } from './onet'

export const MAX_SEED_TASKS = 6
const REMOTE_TIMEOUT_MS = 5000

/**
 * Fetch the occupation record for a matched career: live proxy first (full
 * catalog), bundled seed on failure/timeout, null when both miss. Never
 * rejects — a null just means the résumé seeds title-only, like before.
 * @param {{ code: string, title: string }} career
 * @param {{ timeoutMs?: number, getRemote?: Function, getLocal?: Function }} [deps]  injectable for tests
 * @returns {Promise<object | null>}
 */
export async function fetchOccupationForCareer(
  career,
  { timeoutMs = REMOTE_TIMEOUT_MS, getRemote = getOccupationRemote, getLocal = getOccupation } = {},
) {
  let timer
  try {
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('O*NET lookup timed out')), timeoutMs)
    })
    const remote = await Promise.race([getRemote(career.code, career.title), timeout])
    if (remote) return remote
  } catch {
    // proxy down / offline / timeout — fall through to the seed
  } finally {
    clearTimeout(timer)
  }
  return getLocal(career.code) ?? null
}

// Singular-ish label for the framing line: "Baristas" reads better as
// "people in this job" than a mangled singular, so keep the O*NET title as-is.
function dutiesIntro(title) {
  return `<p><em>Real tasks ${escapeHtml(title)} do — keep the ones you have actually done and reword them as your own:</em></p>`
}

function skillsLine(title, skills) {
  const list = skills.map(s => escapeHtml(s)).join(', ')
  return `<p><strong>${escapeHtml(title)} skills to grow:</strong> ${list}</p>`
}

/**
 * Return a new sections array with the occupation's duties appended to the
 * first `experience` section and its skills to the first `skills` section.
 * Unchanged (deep-equal) when the occupation is missing or has no tasks —
 * the flow degrades to today's title-only behavior.
 * @param {Array<{ title: string, type: string, content: string }>} sections
 * @param {{ title?: string, tasks?: string[], skills?: string[] } | null} occupation
 * @returns {Array<{ title: string, type: string, content: string }>}
 */
export function seedSectionsFromOccupation(sections, occupation) {
  const title = (occupation?.title ?? '').trim()
  const tasks = (occupation?.tasks ?? []).filter(t => typeof t === 'string' && t.trim())
  if (!title || !tasks.length) return sections.map(s => ({ ...s }))

  const skills = (occupation?.skills ?? []).filter(s => typeof s === 'string' && s.trim())
  let experienceSeeded = false
  let skillsSeeded = false

  return sections.map(section => {
    if (section.type === 'experience' && !experienceSeeded) {
      experienceSeeded = true
      return {
        ...section,
        content: section.content + dutiesIntro(title) + bulletsFromTasks(tasks.slice(0, MAX_SEED_TASKS)),
      }
    }
    if (section.type === 'skills' && !skillsSeeded && skills.length) {
      skillsSeeded = true
      return { ...section, content: section.content + skillsLine(title, skills) }
    }
    return { ...section }
  })
}
