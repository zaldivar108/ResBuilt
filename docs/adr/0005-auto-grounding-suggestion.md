# ADR 0005 — Auto-suggest the O*NET grounding occupation

- **Status:** Accepted — not yet implemented (gap #5, 2026-07-07 AI review)
- **Date:** 2026-07-07

## Context

"Suggest ideas" grounds on an O*NET occupation (`groundOcc`) only after the
user visits the "Real job duties" tab and picks a job — manual and buried.
Most résumés already say what job they're for (title like "Barista Resume",
objective text). The on-device seed search (`searchOccupations`) makes
guessing free.

## Decision

Auto-suggest — never auto-apply — a grounding occupation:

- Derive candidate terms from the résumé title and the summary/objective
  section text (strip filler like "Resume"/"Résumé", split into phrases).
- Run them through the existing search: on-device seed always; live proxy
  (`searchOccupationsRemote`) when available, same fallback contract as
  `OnetSuggest`.
- Top hit renders as a one-line nudge in the Ideas surface:
  "Ground ideas in real *Barista* duties? [Use it]" — one click sets
  `groundOcc` exactly as the manual path does. Dismissal is remembered per
  résumé (don't re-nag).
- Résumés started from the quiz (careerSeed path) or with a persisted
  `targetJob` (ADR 0004) prefer that as the suggestion source over title
  guessing — it is explicit intent.

## Consequences

- Grounding stops depending on users discovering a second tab; ideas quality
  improves with zero quota cost (search is seed/proxy, not the AI service).
- Wrong guesses are contained: it's a suggestion chip, one click to accept,
  dismissable, never silently applied.
- Title heuristics are simple string work in a pure lib → unit-testable.
- Adds a small precedence rule (quiz/targetJob > title guess) that must be
  documented in the lib, or debugging "why this suggestion?" gets hard.
