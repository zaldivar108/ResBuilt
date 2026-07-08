---
id: 007
title: Tone picker + "Another version" result variants
adr: 0007
type: AFK
status: ready
blocked_by: []
---

## Parent

ADR 0007 — "Another version" result variants via a tone/variant parameter.

## What to build

After any text-task result, the AI workspace offers "Another version" and a
small tone picker (allow-listed values, e.g. confident / friendly / plain).
Variation is part of the request, not a cache bypass: the proxy accepts
optional `tone` and `variant` parameters (server-side allow-list, same
guard pattern as the task map), maps them to prompt additions, and the
client cache key includes both — every seen variant is cached, so flipping
back through earlier versions is free and only a *new* variant spends one
AI action.

The workspace shows which version is displayed ("version 2 of 3") and lets
the user flip between cached versions before applying. No hidden
multi-sampling — one click, at most one provider call.

## Acceptance criteria

- [ ] Proxy accepts allow-listed `tone` + `variant`; unknown values →
      400 (tests, including prototype-pollution-style keys)
- [ ] Cache key includes tone + variant; re-viewing a seen variant makes no
      network call and costs no budget (test)
- [ ] "Another version" spends exactly one AI action; budget indicator
      updates
- [ ] Version indicator + back/forward flip through cached variants;
      Apply uses the displayed version
- [ ] Streaming tasks work with variants (variant nudge rides the prompt)
- [ ] Full suite green; one live round-trip via `vercel dev`

## Blocked by

None - can start immediately.
