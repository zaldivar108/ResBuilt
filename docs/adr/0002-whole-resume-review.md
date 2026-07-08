# ADR 0002 — Whole-résumé review: on-device checklist first, AI pass second

- **Status:** Accepted — not yet implemented (gap #2, 2026-07-07 AI review)
- **Date:** 2026-07-07

## Context

AI Assist acts on one section at a time; nothing evaluates the résumé as a
whole. First-time writers need document-level feedback most: weak bullets,
generic objective, tense inconsistency, duplicate skills, over/under length.
Constraints: 25-actions/day device budget (`aiBudget.js`), shared free-tier
quota, reasoning models need `REASONING_HEADROOM` (~2000 tokens), per-task
`maxInput` caps in `api/ai.js`.

## Decision

Build in two halves, shipped in this order:

1. **On-device checklist (free, quota-exempt).** New pure lib
   `src/lib/resumeChecklist.js`: heuristics over all sections — bullets
   without numbers, generic objective phrases, mixed verb tense, duplicate
   skills, estimated length vs one page. Rendered as a review panel in the
   editor. Pure functions over the sections array → TDD-friendly, zero
   network, always available (works under plain `npm run dev`).
2. **AI pass (one call, opt-in).** New `review` task in `api/ai.js` returning
   JSON (`strengths`/`issues` per section id). PII-scrubbed all-sections
   input (per ADR 0001/0009). Declare a required JSON key so the wrong-shape
   fallback to Groq works (same mechanism as `import`→`sections`). Budget:
   counts as one AI action. Respect `maxInput` — truncate per-section, never
   silently drop whole sections.

The checklist is the default surface; the AI pass is a button inside it.

## Consequences

- Most review value lands with zero quota cost and no consent friction.
- The AI pass reuses existing proxy plumbing (tiering, fallback, caps);
  main risk is input size on long résumés — mitigated by per-section caps.
- Checklist heuristics will have false positives (e.g. tense detection);
  present as suggestions, never auto-fix.
- Two sources of feedback must not conflict visually — one panel, two lists.
