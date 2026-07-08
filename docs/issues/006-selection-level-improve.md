---
id: 006
title: Selection-level "Improve this" from the toolbar
adr: 0006
type: AFK
status: done
blocked_by: [003]
---

## Parent

ADR 0006 — Selection-level AI ("rewrite this bullet").

## What to build

An AI button in the editor toolbar, enabled when a non-empty text selection
exists inside the editor, that rewrites just the selected fragment. Sends
only the selected plain text through the existing `improve` task with a
"rewrite this fragment" prompt hint — no new proxy task; one AI action;
PII scrub applies; result caches on the fragment text.

The result appears in the AI workspace like any other result, with the diff
preview (issue 003). Apply replaces only the selected range, with the
capture-and-verify rule from the ADR: capture the range at request time; if
the section, selection, or content changed by Apply time, refuse with a
clear message ("reselect and retry") instead of guessing. Replacement passes
through the sanitize-at-write boundary.

## Acceptance criteria

- [ ] Toolbar AI button: disabled with no/empty selection, enabled inside
      the editor selection; tooltip + aria-label like other toolbar buttons
- [ ] Only the selected text is sent; consent/budget behavior identical to
      section-level improve
- [ ] Apply replaces exactly the captured range; result HTML sanitized at
      the write boundary
- [ ] Stale range (section switched, content edited, selection moved) →
      Apply refuses with a friendly message; section content never corrupted
- [ ] Result shows via the diff preview against the selected fragment
- [ ] Unit tests for range capture/verify logic; component test for the
      disabled/enabled toolbar states
- [ ] Full suite green

## Blocked by

- 003 (fragment result presents through the diff preview)
