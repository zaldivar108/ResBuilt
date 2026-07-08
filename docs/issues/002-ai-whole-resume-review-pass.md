---
id: 002
title: AI whole-résumé review pass (review task + panel button)
adr: 0002
type: AFK
status: done
blocked_by: [001]
---

## Parent

ADR 0002 — Whole-résumé review: on-device checklist first, AI pass second.

## What to build

An opt-in "Ask the AI to review" button inside the checklist panel (issue
001) that sends the whole résumé — PII-scrubbed, per-section-capped — in one
call to a new `review` task on the AI proxy, and renders returned
strengths/issues per section alongside the on-device findings (one panel,
two lists; no visual conflict).

The task returns JSON keyed by section id with `strengths` and `issues`.
Declare a required JSON key so the wrong-shape provider fallback works (same
mechanism as the `import`→`sections` guard). Respect reasoning-model
headroom and the task's `maxInput` cap: truncate long sections individually,
never silently drop a section. Costs exactly one action from the daily
budget; consent copy states the whole résumé (scrubbed) is sent.

## Acceptance criteria

- [ ] New `review` task on the proxy: JSON mode, required-key fallback
      guard, per-section input caps, reasoning headroom respected (tests)
- [ ] Outbound text runs through the existing PII scrub before sending
- [ ] One click = one AI action against the daily budget; budget/consent
      shown before the call
- [ ] Results render per section in the checklist panel, distinct from
      on-device findings
- [ ] Wrong-shape or failed response degrades to a friendly retryable error;
      on-device findings remain visible
- [ ] Full suite green; live round-trip verified once via `vercel dev`

## Blocked by

- 001 (panel is the host surface)
