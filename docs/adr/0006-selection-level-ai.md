# ADR 0006 — Selection-level AI ("rewrite this bullet")

- **Status:** Accepted — not yet implemented (gap #6, 2026-07-07 AI review)
- **Date:** 2026-07-07

## Context

AI tasks operate on whole sections; there is no way to improve a single
bullet or sentence. For first-time writers the unit of struggle is one
bullet. The toolbar has no AI entry; the contentEditable editor already
tracks selection for formatting (`selectionchange` in `EditorToolbar`).

## Decision

Add an inline "Improve this" action scoped to the current text selection:

- **Entry point: the editor toolbar** (AI button, enabled when a non-empty
  selection exists inside the editor), not a floating popover — popovers
  fight the existing selection/toolbar plumbing and mobile.
- Send *only the selected text* (plain text) through the existing `improve`
  task with a "rewrite this fragment" prompt hint — no new proxy task
  tier; counts as one AI action; PII scrub applies (ADR 0009).
- Result shows in the AI workspace like any other result (with diff preview
  per ADR 0003); Apply replaces just the selected range.
- **Range integrity rule:** capture the range at request time; if the
  section, selection, or content changed by the time Apply is clicked,
  refuse and say why (same stale-apply protection the dock already has for
  sections). Replacement goes through the sanitize-at-write boundary
  (`applyAiToSection` equivalent for ranges).

## Consequences

- The highest-frequency need (one weak bullet) gets a direct path; whole-
  section replacement stops being the only granularity.
- Range replacement inside uncontrolled contentEditable is the risky part —
  hence capture-and-verify semantics; worst case degrades to "reselect and
  retry", never a corrupted section.
- No new API surface: proxy, budget, cache, consent all reuse the `improve`
  pipeline (cache keys on the fragment text, so repeats are free).
