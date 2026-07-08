# Issues — AI-experience gaps

File-based issue tracker (no GitHub Issues by choice). One file per issue,
front-matter: `id`, `title`, `adr`, `type` (AFK = implementable without
human input), `status` (`ready` | `in-progress` | `done`), `blocked_by`.

Each issue is a vertical slice: lib + API (where relevant) + UI + tests,
demoable on its own. Approach for every slice is locked in its parent ADR
(`docs/adr/`) — read it first. All slices inherit the standing constraints
from `docs/adr/README.md` (free providers, 25/day budget, reasoning
headroom, TDD, Paper & Ink).

To grab one: pick the lowest-numbered `ready` issue whose `blocked_by` are
all `done`, set `status: in-progress`, implement, set `status: done` in the
same PR/commit.

| # | Title | ADR | Blocked by | Status |
|---|-------|-----|-----------|--------|
| [001](001-on-device-resume-checklist.md) | On-device résumé checklist (lib + editor panel) | 0002 | — | done |
| [002](002-ai-whole-resume-review-pass.md) | AI whole-résumé review pass | 0002 | 001 | ready |
| [003](003-diff-preview-before-apply.md) | Word-level diff preview before Apply | 0003 | — | ready |
| [004](004-persist-target-job.md) | Persist `targetJob` on the résumé object | 0004 | — | ready |
| [005](005-auto-grounding-suggestion.md) | Auto-suggest grounding occupation | 0005 | 004 | ready |
| [006](006-selection-level-improve.md) | Selection-level "Improve this" | 0006 | 003 | ready |
| [007](007-result-variants.md) | Tone picker + "Another version" variants | 0007 | — | ready |
| [008](008-fuller-onet-seed.md) | Fuller O*NET seed extract | 0008 | — | ready |
| [009](009-pii-scrub-all-outbound.md) | PII scrub-and-restore on all outbound AI text | 0009 | — | ready |
