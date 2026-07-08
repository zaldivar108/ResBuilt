# ADR 0007 — "Another version" result variants via a tone/variant parameter

- **Status:** Accepted — not yet implemented (gap #7, 2026-07-07 AI review)
- **Date:** 2026-07-07

## Context

AI results are one-shot: no "try another version", no tone control. The
result cache (`aiCache.js`) is keyed on input, so an identical retry returns
the cached result by design — a bare "regenerate" button would appear broken.

## Decision

Make the variation *part of the request*, not a cache bypass:

- Add an optional `tone` parameter to text tasks in `api/ai.js`
  (allow-listed values: e.g. `confident`, `friendly`, `plain`) appended to
  the prompt; and a `variant` counter for "another version" that maps to a
  prompt nudge ("give a different phrasing than before").
- Cache key includes `tone` + `variant` — each variant is cached
  independently; re-requesting a seen variant is free.
- UI: after a result, offer "Another version" (increments `variant`, costs
  one AI action) and a small tone picker (applies on next run). Show which
  variant is displayed ("version 2 of 3") and let the user flip back to
  cached earlier versions at zero cost.
- Budget: each *new* variant is a real provider call → one action from the
  25/day budget. No hidden multi-sampling (never burn N calls for one
  click).

## Consequences

- Variants become deterministic, cacheable, and budget-honest; the cache
  stays semantically correct (key = full request intent).
- Allow-listing `tone` server-side keeps the prompt-injection surface
  closed (same `Object.hasOwn` guard pattern as the task map).
- Flip-back-to-previous makes exploration cheap and teaches revision —
  aligned with the teen-writer audience.
- Slight state growth in the AI workspace (variant history per input);
  bounded by the existing cache size policy.
