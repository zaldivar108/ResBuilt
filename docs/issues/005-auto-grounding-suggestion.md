---
id: 005
title: Auto-suggest grounding occupation (chip in Ideas)
adr: 0005
type: AFK
status: done
blocked_by: [004]
---

## Parent

ADR 0005 — Auto-suggest the O*NET grounding occupation.

## What to build

When Suggest ideas has no grounding occupation set, show a one-line
suggestion chip — "Ground ideas in real *Barista* duties? [Use it]" — that
sets the grounding with one click, exactly as the manual "Real job duties"
pick does. Never auto-applied.

Candidate derivation per the ADR, in a pure lib: strip filler
("Resume"/"Résumé") from the résumé title, take phrases from the
summary/objective text, run them through the existing occupation search
(on-device seed always; live proxy when reachable, same fallback contract
the duties tab uses). Source precedence: persisted `targetJob` (issue 004)
or quiz-seeded career beats title guessing — explicit intent wins; document
the precedence rule in the lib. Dismissal is remembered per résumé (no
re-nagging).

## Acceptance criteria

- [ ] Pure suggestion lib with unit tests: title/objective term extraction,
      precedence (targetJob/quiz > title guess), no-match → no suggestion
- [ ] Chip appears in the Ideas surface only when grounding is unset and a
      confident match exists; one click sets grounding
- [ ] Dismissal persists per résumé; chip does not reappear for that résumé
- [ ] No AI-service call involved (seed/proxy search only, quota-free)
- [ ] Suggestion never auto-applies; manual grounding path untouched
- [ ] Full suite green

## Blocked by

- 004 (precedence rule reads `resume.targetJob`)
