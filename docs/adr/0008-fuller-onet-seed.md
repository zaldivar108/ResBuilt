# ADR 0008 — Ship a fuller O*NET seed behind the same repository interface

- **Status:** Accepted — not yet implemented (gap #8, 2026-07-07 AI review)
- **Date:** 2026-07-07

## Context

The bundled O*NET seed (`src/config/onetData.js`) has ~10 occupations. Plain
`npm run dev` (no `/api` proxy) and any offline/proxy-failure path fall back
to it, so most searches dead-end — the seed has no IT/tech roles at all.
`docs/onet-extract.md` already documents how to build a fuller extract from
the O*NET bulk database (CC BY 4.0). The repository interface
(`searchOccupations`/`getOccupation` in `src/lib/onet.js`) was designed so
the data source can swap without touching callers.

## Decision

Generate a fuller static extract and ship it as the new seed:

- Follow `docs/onet-extract.md` Option A (bulk DB): all occupations at a
  teen/young-adult-relevant job-zone cut (zones 1–3, plus common zone-4
  entry titles), title + keywords (`also_called`) + top ~10 core tasks +
  top skills per occupation.
- Same module shape (`OCCUPATIONS` array), same interface — zero caller
  changes; existing careerSeed/JobTailor/OnetSuggest fallbacks get coverage
  for free.
- **Lazy-load the seed** if the extract pushes past ~100 kB gzip: dynamic
  `import()` inside `onet.js` on first search, keeping it out of the main
  bundle (budget: app page < 300 kB gzip total).
- Keep attribution (CC BY 4.0 header + landing-footer credit) — a license
  requirement, not a nicety.
- The live proxy remains preferred when configured; the seed is the floor,
  not the ceiling.

## Consequences

- Local dev, offline use, and proxy outages stop dead-ending search; the
  quiz→seed path (careerSeed fallback) gains real coverage.
- Bundle impact is the main cost — controlled by field pruning + lazy load;
  the extract script becomes a maintained artifact (document the O*NET DB
  version used, regenerate on major O*NET releases).
- Seed and live records must keep the same shape (`skills: []` parity issue
  already noted in `normalizeCareer`) so downstream consumers stay
  source-agnostic.
