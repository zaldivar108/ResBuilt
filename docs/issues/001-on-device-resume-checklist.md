---
id: 001
title: On-device résumé checklist (lib + editor panel)
adr: 0002
type: AFK
status: ready
blocked_by: []
---

## Parent

ADR 0002 — Whole-résumé review: on-device checklist first, AI pass second.

## What to build

A review panel in the editor that evaluates the *whole* résumé on-device and
lists concrete, teen-readable suggestions. Heuristics live in a new pure lib
(`resumeChecklist` naming per ADR) operating over the résumé's sections
array: bullets without numbers, generic objective phrases, mixed verb tense
across experience bullets, duplicate skills, and estimated length vs one
page. Zero network, zero AI-budget cost, works under plain `npm run dev`.

Findings are suggestions, never auto-fixes. Each finding names the section
it came from; clicking it activates that section in the editor. The panel
follows Paper & Ink rules (no gradients/emoji, lucide icons, accent used
semantically).

## Acceptance criteria

- [ ] Pure checklist lib with unit tests for every heuristic (TDD; happy +
      empty/degenerate inputs — empty résumé, hidden sections, no-bullet sections)
- [ ] Heuristics implemented: numberless bullets, generic objective, tense
      inconsistency, duplicate skills, length vs one page
- [ ] Editor panel renders grouped findings with section names; clicking a
      finding selects that section
- [ ] Hidden sections excluded from checks
- [ ] Panel is reachable from the editor without crowding the AI dock
      (placement respects the fixed 30% AI dock split)
- [ ] `aria-live` on the findings region; keyboard reachable
- [ ] Full suite green; no new lint errors; build green

## Blocked by

None - can start immediately.
