# Architecture Decision Records

Decisions for ResBuilt. Format: lightweight MADR (Status / Context /
Decision / Consequences). Statuses: `Accepted` (binding), `Accepted — not
yet implemented` (approach locked, work pending), `Superseded by NNNN`.

ADRs 0002–0009 lock the approach for the 2026-07-07 AI-gaps review
(priority-ranked list in `HANDOFF.md` §0). Gap #1 (quiz→seeded résumé)
shipped directly (`src/lib/careerSeed.js`) and needs no ADR.

| # | Title | Status |
|---|-------|--------|
| [0001](0001-resume-text-to-hosted-ai.md) | Privacy-first app deliberately sends résumé text to hosted AI providers | Accepted |
| [0002](0002-whole-resume-review.md) | Whole-résumé review: on-device checklist first, AI pass second | Accepted — pending |
| [0003](0003-diff-preview-before-apply.md) | Word-level diff preview before applying AI edits (jsdiff) | Accepted — pending |
| [0004](0004-persist-target-job.md) | Persist the job-match target on the résumé object | Accepted — pending |
| [0005](0005-auto-grounding-suggestion.md) | Auto-suggest the O*NET grounding occupation | Accepted — pending |
| [0006](0006-selection-level-ai.md) | Selection-level AI ("rewrite this bullet") | Accepted — pending |
| [0007](0007-result-variants.md) | Result variants via tone/variant request parameters | Accepted — pending |
| [0008](0008-fuller-onet-seed.md) | Fuller O*NET seed behind the same repository interface | Accepted — pending |
| [0009](0009-pii-scrub-all-outbound.md) | PII scrub-and-restore on all outbound AI text | Accepted — pending |

Standing constraints every ADR above inherits: free providers only,
25 AI actions/device/day (`aiBudget.js`), reasoning-model token headroom
(`REASONING_HEADROOM` in `api/ai.js`), TDD, Paper & Ink design rules.
