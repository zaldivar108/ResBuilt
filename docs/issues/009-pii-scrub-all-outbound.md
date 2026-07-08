---
id: 009
title: PII scrub-and-restore on all outbound AI text
adr: 0009
type: AFK
status: ready
blocked_by: []
---

## Parent

ADR 0009 — PII scrub on all outbound AI text, not just "ideas".

## What to build

Every provider-bound request carries redacted text. Two modes per the ADR:

- **Scrub-and-restore** for rewriting tasks (improve, format on non-contact
  sections, polish, retarget, future review-apply paths): replace each PII
  match with a stable placeholder (`[EMAIL_1]`, `[PHONE_1]`, …) before
  sending; substitute originals back before sanitize/preview/apply. Mapping
  lives only in client memory for the request's lifetime.
- **Scrub-only** for analysis tasks (ideas — current behavior — and the
  résumé side of tailor).

The pure pair (`scrubForRequest`/`restoreFromResponse`) extends the existing
scrub lib with the round-trip property: restore(scrub(x)) === x when the
model preserves tokens; a dropped token stays visible as a placeholder so
the diff preview makes the loss obvious — never silent data loss. Task
prompts gain a "keep [EMAIL_1]-style tokens unchanged" instruction. Contact
sections remain never-sent (hard rule, unchanged). Cache keys use scrubbed
text, so cached results stop embedding PII.

## Acceptance criteria

- [ ] Pure scrub/restore pair with property-style tests (round-trip
      identity, multiple same-type matches, token dropped by model →
      placeholder survives to output)
- [ ] All rewriting tasks send placeholder text; originals restored before
      sanitize/preview/apply (integration test per task)
- [ ] Analysis tasks keep scrub-only redaction
- [ ] Contact sections still never sent (regression test)
- [ ] Prompts instruct token preservation; one live `vercel dev` round-trip
      confirms tokens echo through a reasoning model
- [ ] Result cache entries contain no raw PII (test inspects stored keys +
      values)
- [ ] Full suite green

## Blocked by

None - can start immediately.
