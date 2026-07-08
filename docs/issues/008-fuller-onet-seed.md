---
id: 008
title: Fuller O*NET seed extract (zones 1–3, lazy-loaded)
adr: 0008
type: AFK
status: ready
blocked_by: []
---

## Parent

ADR 0008 — Ship a fuller O*NET seed behind the same repository interface.

## What to build

Replace the ~10-occupation bundled seed with a generated extract from the
O*NET bulk database (per `docs/onet-extract.md` Option A): occupations at
job zones 1–3 plus common zone-4 entry titles, each with title, keywords
(also-called), top ~10 core tasks, and top skills. Same exported array
shape and repository interface — zero caller changes; search, quiz seeding,
and job-tailor fallbacks gain coverage automatically.

Ship the extract generator as a maintained script that records the O*NET DB
version used. If the extract exceeds ~100 kB gzip, lazy-load it via dynamic
import inside the repository module on first use so the main bundle stays
within budget. Keep CC BY 4.0 attribution (data header + landing footer) —
license requirement.

## Acceptance criteria

- [ ] Generator script checked in; documents source DB version and
      regeneration steps; deterministic output
- [ ] Seed covers zones 1–3 (spot-check: IT/tech, healthcare-entry, office
      roles now findable offline; "cash"→Cashiers still first)
- [ ] Record shape identical to live-path records (skills parity noted in
      the normalizers) — existing repository tests pass unchanged
- [ ] Offline/plain `npm run dev` search no longer dead-ends common queries
      (test against the new seed)
- [ ] Main bundle gzip size unchanged if lazy-load triggered; measured and
      noted in the PR
- [ ] CC BY 4.0 attribution intact in data file + landing footer
- [ ] Full suite green

## Blocked by

None - can start immediately.
