# ADR 0003 — Word-level diff preview before applying AI edits

- **Status:** Accepted — not yet implemented (gap #3, 2026-07-07 AI review)
- **Date:** 2026-07-07

## Context

Applying an AI result (`AiWorkspace` → `applyResult`) replaces the section
wholesale. The user can't see what changed before committing — worst for
"Fix grammar", where teens learning to write should see each correction.
An 8-second undo toast exists, but that is recovery, not informed consent.

## Decision

Show a word-level diff (insertions/deletions marked) between
`section.content` and the AI result, inside the preview, before Apply.

- **Library: `diff` (jsdiff).** Small, battle-tested, no transitive deps, no
  new provider. Use `diffWords` on the *text* layer.
- **Diff plain text, not HTML strings.** Extract text from both HTML
  contents (DOM parse), diff the text, render markers (`<ins>`/`<del>`
  styling per the Paper & Ink tokens — no red/green defaults; use accent +
  strikethrough). Diffing raw HTML markup produces tag-noise diffs.
- Apply still writes the sanitized AI HTML exactly as today
  (`applyAiToSection` path unchanged); the diff is a *view*, never the
  source of the applied content.
- Streaming tasks show the diff once the stream completes (diff-while-
  streaming is churn for no value).

## Consequences

- "Fix grammar" becomes a teaching surface — users see every correction.
- Because the diff is text-level, pure formatting changes (e.g. Format task
  restructuring markup) may show as large moves; acceptable — Format is a
  layout action, diff still shows wording deltas.
- One new dependency (~15 kB gzip, lazy-loadable with the AI workspace).
- New pure helper (`diffPreview.js`) is unit-testable without the editor.
