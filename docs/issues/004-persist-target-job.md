---
id: 004
title: Persist targetJob on the résumé object
adr: 0004
type: AFK
status: done
blocked_by: []
---

## Parent

ADR 0004 — Persist the job-match target on the résumé object.

## What to build

The Job match posting survives reloads and section switches by living on the
résumé record instead of component state. Shape decided by the ADR:

```js
resume.targetJob = { text, title?, source, savedAt }
// source: 'pasted' | 'quiz' | 'onet'
```

Written through the existing update/patch path (same localStorage
persistence as everything else — no new storage key). The Job match tab
hydrates from it on mount, offers "Clear target", and overwrites it when a
new posting is pasted. The quiz→tailor bridge records `source: 'quiz'`.
Résumés without the field behave exactly as today — no migration.

## Acceptance criteria

- [ ] Pasting/analyzing a posting persists `targetJob`; reload restores it
      into the Job match tab
- [ ] "Clear target" removes it; new paste overwrites it
- [ ] Quiz→tailor bridge sets `source: 'quiz'`; manual paste sets `'pasted'`
- [ ] Old résumés (no field) load and tailor exactly as before (test with a
      stored fixture lacking the field)
- [ ] Duplicating a résumé copies its target; posting stored as plain text,
      never rendered as HTML
- [ ] Context/persistence tests cover the new field round-trip
- [ ] Full suite green

## Blocked by

None - can start immediately.
