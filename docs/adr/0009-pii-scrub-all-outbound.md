# ADR 0009 — PII scrub on all outbound AI text, not just "ideas"

- **Status:** Accepted — not yet implemented (gap #9, 2026-07-07 AI review; security follow-up H2)
- **Date:** 2026-07-07

## Context

`scrubPii.js` (email/phone/URL redaction) currently applies only to the
"Suggest ideas" task. Improve, format (non-contact), polish, tailor, and
retarget send section text verbatim to the AI service. The audience is
minors; ADR 0001 rule 3 says PII minimization is the control we own. The
gap exists because scrubbing *rewriting* tasks risks the model echoing
redaction placeholders back into the applied result.

## Decision

Extend the scrub to every outbound task, with a round-trip guarantee:

- **Scrub-and-restore for rewriting tasks** (improve/format/polish/
  retarget/review): replace each PII match with a stable placeholder token
  (`[EMAIL_1]`, `[PHONE_1]`…) before sending; on receipt, substitute the
  original values back before sanitize/preview/apply. Mapping lives only in
  client memory for the request's lifetime.
- **Scrub-only for analysis tasks** (ideas — current behavior — and
  tailor's résumé side): nothing is applied back verbatim, so plain
  redaction suffices.
- Placeholder restore is a pure function pair
  (`scrubForRequest`/`restoreFromResponse`) in `scrubPii.js` — property:
  `restore(scrub(x).text) === x` when the model preserves tokens; when it
  drops one, the restore leaves the placeholder visible so the diff preview
  (ADR 0003) makes the loss obvious instead of silently losing a phone
  number.
- Contact sections remain never-sent (hard rule, unchanged).

## Consequences

- Every provider-bound request carries redacted text; the residual risk
  narrows to PII the regexes miss (names, schools) — named-entity scrubbing
  is out of scope (no on-device NER within budget).
- Prompt tokens grow slightly; placeholders must be documented in task
  prompts ("keep [EMAIL_1]-style tokens unchanged") to keep echo fidelity
  high — reasoning models handle this well.
- Cache keys naturally use scrubbed text → cached results no longer embed
  PII either (a quiet win for `localStorage` hygiene).
- Test surface is pure and property-testable; failure mode is visible
  placeholder residue, never silent data loss.
