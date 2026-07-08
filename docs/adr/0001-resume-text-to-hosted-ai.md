# ADR 0001 — A privacy-first app deliberately sends résumé text to hosted AI providers

- **Status:** Accepted (documents existing behavior)
- **Date:** 2026-07-07

## Context

ResBuilt's core promise is privacy-first: no account, all data in
`localStorage`, audience is teenagers and young adults (minors). Yet several
AI features send résumé text off-device to hosted providers (OpenCode Zen,
fallback Groq) via the `api/ai.js` Edge proxy: import, improve, ideas, format
(non-contact), polish, tailor, retarget. This looks like a contradiction and
must be a documented, deliberate trade-off — not an accident.

## Decision

Keep hosted AI for text-generation tasks, under these standing rules:

1. **On-device whenever feasible.** Grammar (harper.js WASM), O*NET duty
   insertion, contact-section formatting, and the review checklist (ADR 0002)
   run fully in-browser. Any new AI feature must justify why it cannot.
2. **Consent shown at the point of use.** Every surface that sends text
   displays what is sent and to whom ("the AI service" — provider-neutral
   wording). The info orb explains the full on-device/off-device split.
3. **PII minimization on outbound text.** `scrubPii.js` redacts
   emails/phones/URLs; contact sections are never sent (on-device path or
   task disabled). Scope is being widened to all outbound tasks (ADR 0009).
4. **Free providers only, keys server-side.** The proxy holds the keys;
   clients never see them. No paid providers — the product is free.
5. **No retention assumption.** We do not rely on provider zero-retention
   guarantees; minimization (rules 1–3) is the control we own.

## Consequences

- The privacy claim is scoped: "your résumé lives on your device" is true for
  storage; AI editing sends the text you're editing, with consent, minimized.
- Provider swaps stay cheap (proxy owns the contract; "the AI service"
  wording avoids stale UI copy).
- Residual risk: non-contact sections may still contain PII in free text
  (e.g. a school name). ADR 0009 narrows this; it cannot reach zero without
  dropping hosted AI entirely.
- If a future feature needs full-résumé context (ADR 0002 AI pass), it
  inherits these rules — scrub first, consent visibly, one call.
