# ADR 0004 — Persist the job-match target on the résumé object

- **Status:** Accepted — not yet implemented (gap #4, 2026-07-07 AI review)
- **Date:** 2026-07-07

## Context

`JobTailor`'s pasted posting lives in component state. Every retailor — and
every reload — means re-pasting the posting. The posting is the user's
tailoring context for the *document*, not for one dock session. Whole-résumé
tailoring (future) and auto-grounding (ADR 0005) both want a durable target.

## Decision

Store the target on the résumé record itself:

```js
resume.targetJob = { text, title?, source, savedAt }
// source: 'pasted' | 'quiz' | 'onet'
```

- Written via the existing `updateResume`/`patch` path (same persistence as
  everything else — `localStorage`, no new storage key).
- `JobTailor` hydrates from `resume.targetJob` on mount and offers
  "Clear target"; pasting a new posting overwrites it.
- The quiz→tailor bridge (`occupationToPosting`) sets `source: 'quiz'`.
- Missing/old résumés without the field behave exactly as today (absent →
  empty posting box). No migration needed.

## Consequences

- Retailoring after reload or section-switch is one click; the posting
  survives with the document it belongs to.
- Whole-document tailoring and the review AI pass (ADR 0002) get a canonical
  place to read the target from.
- Résumé JSON grows slightly (a posting can be a few kB); well within the
  ~5 MB `localStorage` budget, but `duplicateResume` copies it — acceptable,
  arguably correct.
- The posting is user-pasted third-party text stored as plain text — it is
  never rendered as HTML (existing tailor path already treats it as text).
