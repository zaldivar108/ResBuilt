---
id: 003
title: Word-level diff preview before Apply (jsdiff)
adr: 0003
type: AFK
status: ready
blocked_by: []
---

## Parent

ADR 0003 — Word-level diff preview before applying AI edits.

## What to build

Before Apply, the AI workspace shows a word-level diff between the active
section's current content and the AI result, so users (especially "Fix
grammar" learners) see exactly what changes. Use the `diff` (jsdiff)
package, lazy-loaded with the AI workspace.

Per the ADR: diff the *text* layer (extract text from both HTML contents),
never raw HTML strings; render insertions/deletions with Paper & Ink-
compliant marks (accent + strikethrough — no red/green defaults, works in
both themes). The diff is a view only — Apply still writes the sanitized AI
HTML through the existing write path unchanged. Streaming tasks show the
diff once the stream completes.

## Acceptance criteria

- [ ] Pure diff helper lib with unit tests (text extraction from HTML,
      word-level ins/del segments, identical-input → no marks)
- [ ] Diff view renders in the AI workspace between result and Apply for
      all section-replacing tasks
- [ ] Streaming tasks: diff appears after stream completion, not during
- [ ] Applied content byte-identical to the non-diff path (view-only proof:
      existing apply tests still pass unmodified)
- [ ] Ins/del styles legible in light and dark themes; no red/green-only
      encoding (a11y)
- [ ] jsdiff lazy-loaded; main bundle size unchanged
- [ ] Full suite green

## Blocked by

None - can start immediately.
