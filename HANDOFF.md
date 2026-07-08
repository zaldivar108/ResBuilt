# ResBuilt — Project Handoff

_Last updated: 2026-07-08 · Branch `master` · Build: green · Tests: 361 passing · npm audit: 0 vulns · v0.1.0 · Prod: https://resbuilt.vercel.app (live, deployed)_

**LATEST FIX (part 8) — `599bd2a`, pushed, prod redeploy in flight:** user reported "AI couldn't process résumé" on **prod** import. Root cause: `api/ai.js`'s provider-fallback loop had **no per-provider timeout** — OpenCode's free reasoning models (multi-second by nature, worse on the `import` task's larger token budget) could hang past the Edge function's ~25s wall-clock ceiling, so the Groq fallback never got a turn and the whole request died as a 504 instead of degrading. Confirmed live via curl: `import` timed out (504), `improve` (small tier, fast) returned 200 fine. Fix: `AbortController` + timeout per provider attempt (OpenCode 9s, Groq 12s budget) so a hung primary aborts with room left for the fallback inside the edge ceiling. **Still owed:** re-verify live post-deploy (`curl -X POST https://resbuilt.vercel.app/api/ai -d '{"task":"import","text":"..."}'` should no longer 504); if OpenCode is *routinely* this slow on `import`, consider swapping its large-tier model or dropping OpenCode entirely for `import` (Groq-only for that one task).

_AI provider: **OpenCode Zen** free models (primary) → **Groq** (automatic fallback). Keys `OPENCODE_API_KEY` + `GROQ_API_KEY` set in all 3 Vercel envs._

**Purpose (locked):** a **free** resume builder for **teenagers & young adults** building their first resume — school, part-time jobs, internships, college apps. No paywalls. Privacy-first: **no account required**, data stays on the device.

A client-side resume builder. React 19 + Vite 8. All data lives in `localStorage` (that's the privacy feature, not debt). **AI Assist is live** (OpenCode Zen → Groq fallback proxy + on-device harper.js/O*NET), controls in the sidebar + workspace in the editor column; business cards are mocked; auth is optional/unused.

---

## 0. Session status — where to continue

**Test suite: 361 passing** (`npm run test:run`). Build green throughout. Vitest env is **jsdom** (DOMPurify's reference DOM). Lint: 23 problems vs. baseline 22 — the +1 is two same-category shifts (see issue 006 note below), not a new class of debt. Gaps #2 (issues 001+002), #3 (issue 003), #4 (issue 004), #5 (issue 005), and #6 (issue 006) now fully shipped. Issue 001 committed `420777f`; issues 002–006 committed `2d085ac` — **both pushed to `origin/master`**, working tree clean except `.codex-dev/` (untracked, unrelated to this project's own history — left alone).

### ⭐ NEXT SESSION — 3 gaps left: #7, #8, #9 (issues 007–009)

Everything below through gap #6 is done and pushed. Pick up at issue 007 (tone/variant picker) — `docs/issues/007-result-variants.md`, blocked by nothing. Then 008 (fuller O*NET seed), then 009 (PII scrub all outbound). Same workflow each time: read the ADR + issue file first, TDD the pure lib, wire the UI, run full suite + lint + build, live-verify via `npm run dev`/`vercel dev` + chrome-devtools before marking done.

### Full gap list (historical — #1–#6 done)

Ranked list from the 2026-07-07 AI-gaps review. **Approach for #2–#9 locked in ADRs `docs/adr/0002`–`0009`; work is broken into grabbable vertical-slice issues in `docs/issues/` (001–009, file-based tracker — see its README for the grab protocol)** (part 7). Work top-down; #2's on-device half is quota-free.

1. ~~**Quiz result discards its own data**~~ **DONE (part 7, `8c3022e`)** — "Start a résumé" from the quiz now fetches the career's occupation (live proxy → bundled seed → none, 5s timeout, `fetchOccupationForCareer`) and seeds the student starter's Experience (up to 6 real duties, framed as ideas-to-adapt, escaped) + Skills (occupation skills) via new pure `src/lib/careerSeed.js` (`seedSectionsFromOccupation`) → `createResumeFromImport`. Degrades to title-only when no record. `InterestProfiler` now passes the full career object and shows a disabled "Starting…" state. +14 tests. **Not live-verified in browser yet** (needs `vercel dev`: quiz → results → Start a résumé → editor shows seeded duties).
2. **No whole-résumé review** (ADR 0002) — AI acts on one section at a time. Two halves:
   a. ~~*On-device checklist (free, do first)*~~ **DONE (issue 001)** — heuristics over all sections — bullets without numbers, generic objective phrasing, tense inconsistency, duplicate skills, length vs 1 page. New pure lib `src/lib/resumeChecklist.js` (`checkResume`, +17 tests) + `ResumeChecklistPanel`/`ChecklistTriggerButton` (`src/components/ui/`): a "Review" button in the editor top nav opens an overlay modal (role=dialog, Escape-to-close, focus-on-open — same pattern as InterestProfiler), findings grouped flat with a section badge, clicking a finding switches the editor to that section and closes the modal. Zero network, zero AI-budget cost, Paper & Ink tokens only. Live-verified via `npm run dev` + chrome-devtools (light + dark, click-to-switch-section, Escape, X close — no console errors).
   b. ~~*AI pass (one call)*~~ **DONE (issue 002)** — new `review` task in `api/ai.js` (large tier, JSON mode, `jsonRequire: 'sections'`, maxInput 8000, maxTokens 1600). New pure `src/lib/resumeReview.js`: `buildReviewPrompt` (PII-scrubs via `scrubPii`, per-section cap 800 chars, overall safety cap 7500, labels each block `SECTION <type> (id, title)`) and `parseReviewResult` (validates shape, drops any section id the model invented, drops empty strength/issue pairs) — 17 tests. "Ask the AI to review" button lives inside `ResumeChecklistPanel`, one call = one `aiBudget` action, reuses `aiCache`, degrades to a retryable error while on-device findings stay visible. Live-verified via `vercel dev` + curl (real 200, correct per-section JSON).
3. ~~**Apply is blind — no diff view**~~ **DONE (issue 003)** — new pure `src/lib/diffPreview.js` (`diffSectionText`, dynamic `import('diff')` so jsdiff never inflates the main bundle — confirmed: its own ~3kB gzip chunk, main bundle +0.7kB) + `src/components/ui/DiffPreview.jsx`, wired into `AiWorkspace` for every section-replacing task (all except "Suggest ideas", which appends). Ins/del styled accent-underline / muted-strikethrough (no red/green-only), verified legible in both themes live. Apply still writes the sanitized AI HTML unchanged — diff is view-only. 6 new tests; live-verified via `npm run dev` (Fix grammar on-device, no API key needed) — real misspelling corrections rendered as true word-level marks, Apply produced clean final text.
4. ~~**Job-match target not persisted**~~ **DONE (issue 004)** — `resume.targetJob = { text, title?, source, savedAt }`, written through the existing `patch`/`updateResume` path (no new storage key; `duplicateResume`'s deep-clone already copies it for free). `JobTailor` hydrates the posting box from it on mount, persists on "Analyze match" (source `'pasted'`) or a quiz career pick (source `'quiz'` + title via `occupationToPosting`), and a new "Clear target" button removes it. A provenance ref tracks whether the current posting text came from a paste or a quiz pick so re-analyzing unedited quiz text doesn't get relabeled `'pasted'`; editing it manually does revert it. Threaded through `AiProvider`/`AiWorkspace` context (`targetJob`/`onSaveTargetJob`) same as `section`/`onApply`. 10 new tests (JobTailor + ResumeContext). Live-verified via `npm run dev`: posting survives full reload, Clear target empties it and that persists too.
5. ~~**Ideas grounding manual/buried**~~ **DONE (issue 005)** — new pure `src/lib/groundingSuggest.js` (`suggestGroundingOccupation`, injectable `searchFn`): precedence `resume.targetJob` (issue 004) > stripped résumé title > summary/objective text; returns `null` on no match rather than degrading to a weaker guess. Quiz-seeded résumés need no separate field — their career already lives in the title (`careerSeed.js` names it "`<Career>` Resume"), so the title-guess step covers them for free. New `GroundingSuggestChip.jsx` renders in the Ideas surface in place of the old static tip when a suggestion exists and grounding is unset; "Use it" resolves the full occupation (live→seed, same contract as `OnetSuggest`) before calling the existing `setGroundOcc`; "Dismiss" sets `resume.groundingDismissed` via `patch` (own-résumé, no re-nag). 9 new lib tests. Live-verified via `npm run dev`: title-based chip appeared, Use it → accepted state, Dismiss → static tip, dismissal survived reload.
6. ~~**No selection-level AI**~~ **DONE (issue 006)** — new sparkle-icon toolbar button, enabled only over a non-empty in-editor selection, sends just the selected plain text through the existing `improve` task (server appends a `FRAGMENT_HINT` when `fragment:true`, same tier/budget/cache/consent, no new proxy task). Range integrity: `src/lib/selectionRange.js` captures `{sectionId, contentSnapshot, startOffset, endOffset, text}` — offsets are plain character counts, not live DOM Range objects, verified by exact `innerHTML` match at Apply time; any mismatch refuses ("reselect and try again") instead of guessing. Result shows via the ADR-0003 diff preview against the fragment text; Apply does a targeted DOM range replace (`replaceSelectionRange`) then persists via the same sanitize-at-write path as whole-section edits, sharing the 8s undo toast. 25 new tests (selectionRange, api/ai fragment hint, EditorToolbar enabled/disabled). **Bug caught and fixed during live verification**: the Apply button didn't clear/disable after a successful apply, so a fast second click fell through to the whole-section replace path and overwrote the entire section with just the fragment — fixed by disabling Apply immediately on success and clearing `result` after the "Applied ✓" flash; added 3 regression tests reproducing the exact double-click scenario, then re-verified live. Lint: net +1 error vs. baseline, both same *already-accepted* pre-existing patterns in this codebase (one more `react-hooks/refs` instance in `EditorToolbar.jsx`, which every sibling toolbar button already triggers; one `react-refresh/only-export-components` for exporting the `useAi` hook, same tradeoff `ResumeContext.jsx`'s `useResume` already makes) — no new category of lint debt.
7. **One-shot results** (ADR 0007) — no "another version"/tone variants. Decided: `tone` + `variant` request params, allow-listed server-side, cache key includes both; flip back to cached variants free.
8. **O*NET seed = ~10 occupations** (ADR 0008) — plain `npm run dev` (no `/api`) and offline fallback dead-end most searches. Decided: fuller extract per `docs/onet-extract.md` Option A (zones 1–3), lazy-loaded if >~100 kB gzip, same `onet.js` interface.
9. **PII scrub only on "ideas"** (ADR 0009) — extend to all outbound tasks. Decided: scrub-and-restore with stable placeholders (`[EMAIL_1]`) for rewriting tasks; scrub-only for analysis; contact never sent.

**SHIPPED THIS SESSION — 2026-07-07 (part 7) — gap #1 + ADRs (`8c3022e` + docs):**
- **Gap #1 done** — see item 1 above. New `src/lib/careerSeed.js` + 14 tests (276 total).
- **ADRs written** — `docs/adr/0001` (PII→hosted AI trade-off, the long-owed one — status Accepted, documents existing rules) and `0002`–`0009` (one per remaining gap, status "Accepted — not yet implemented", approach locked). Index at `docs/adr/README.md` incl. standing constraints (free providers, 25/day budget, reasoning headroom, TDD, Paper & Ink).
- Part 6 (UI redesign) committed `34ecd18`.

Constraints to respect: 25/day device budget (`aiBudget.js`), shared free-tier quota, reasoning-model token headroom (`REASONING_HEADROOM`), TDD workflow, no new paid providers.

**SHIPPED THIS SESSION — 2026-07-07 (part 6) — full UI redesign "Paper & Ink" (uncommitted):**

User feedback: UI "looks vibe-coded." Replaced the indigo-gradient/orbs/emoji look with editorial minimalism. **Rules now binding for all new UI: no gradients, no emoji (user explicit), no glow shadows, single flat cobalt accent, lucide icons only.**

- **Tokens** (`src/index.css`) — warm paper `--bg:#F6F5F1`, ink `--ink:#1B1D23`, accent `--accent:#3B5BDB` (+`-strong/-soft/-softer/-border/-tint/-tint-strong`, `--slider-track`), `--font-display: 'EB Garamond'` (already loaded in index.html), shared `.wordmark` class (serif "ResBuilt" + accent period). Old `--primary/*` vars alias to accent for compat.
- **Landing** — full rewrite (light editorial): serif hero "Your first résumé, *done properly.*", CSS-drawn résumé-page mock, ink CTA, 4-feature hairline grid (lucide), O*NET footer kept (license).
- **Dashboard** — serif H1 "My résumés", `btn-secondary` outline buttons + flat accent `btn-new-resume` (all lucide-iconed), flattened `ResumeCard` (no gradient Edit button, ink hover overlay), unified modal/starter/delete styles; full dark-mode restyle (flat slate `#0F1115/#14161C/#262A33`).
- **Editor** — bulk recolor of `Editor.css`/`EditorToolbar.css`/`AiInput.css`/`dropdown-menu.css`/`switch.css`/`InterestProfiler.css`/`ImportModal.css`/`ResumePreview.css`/`AccentColorPicker.css` to tokens (sed map: `#6366F1→var(--accent)`, `#4F46E5/#4338CA→var(--accent-strong)`, `#818CF8→var(--accent-soft)`, `#EEF2FF→var(--accent-tint)`, rgb `99,102,241→59,91,219`, etc.). Export/Save buttons flat accent, no glows/lifts; section-list active = accent-tint; sliders use `var(--accent)/var(--slider-track)` (`sliderBg` in `Editor.jsx`); preview backdrop warmed (`#DCDAD2`).
- **AI dock height consistency (user ask)** — `.ai-side` (sidebar controls) and `.ai-workspace` (editor column) both `flex: 0 0 30%` (fixed, within requested 1/4–1/3) with `min-height` 250/220px; content scrolls inside, consent note pinned bottom (`margin-top:auto`). No more mode-dependent resizing.
- **Emoji purge** — all UI emoji removed (🔒📥🎯🪪📄⚡🎨✨✦⚠ →) → lucide icons (`Lock/Upload/Compass/CreditCard/FileText/Plus`) or plain text. "Make it mine" label kept (test asserts it). `overflow-indicator` icon span deleted (`ResumePreview.jsx`).
- **Login page deleted** (user: "there's no login") — `src/pages/Login.jsx/.css` removed, `/login` route dropped from `App.jsx`. Mock `user/login/logout` still lives in `ResumeContext` (unused; possible future opt-in sync).
- **Copy** — résumé accents unified on Dashboard ("My résumés", "N résumé(s)").
- Résumé template layouts (`src/components/layouts/*`) deliberately untouched — document styles, not app UI.
- Verified: build green, 262/262 tests, chrome-devtools screenshots (landing, dashboard light+dark, new-résumé modal, editor light+dark, dock in all 3 modes). Design rules memorized in `~/.claude` memory `project-design-system`.

**SHIPPED THIS SESSION — 2026-07-07 (part 5) — AI dock relocated into sidebar + editor column, privacy info orb (`8fdc22b`, pushed):**

The floating bottom-right AI dock (540×540 expanding panel) is gone. AI Assist is now two docked surfaces sharing one `AiProvider` (`src/components/ui/AiInput.jsx`):
- **`AiControls`** — mode tabs (Edit my text / Real job duties / Match a job) + the 4 task buttons — pinned to the bottom of the **sections sidebar** (Col 1), max-height 62%.
- **`AiWorkspace`** — the textbox/answers/results/consent — rendered in the **editor column** (Col 2), below the contentEditable, max-height 68%. `OnetSuggest`/`JobTailor` moved in unchanged (self-contained, just re-homed).
- **`AiInfoOrb`** — the old decorative corner orb (Col 3 preview panel) is now a clickable button; opens a card explaining what's on-device (grammar, O*NET add, contact format) vs. sent to the AI service (OpenCode Zen → Groq) vs. sent to O*NET (job search), plus the no-account/browser-only/25-per-day notes. Closes on outside-click or Esc.

Both AI surfaces read the same context, so switching sections/mode/task from the sidebar updates the workspace instantly — no prop drilling, no state duplication. `Editor.jsx` wraps both columns in `<AiProvider>`. CSS: `AiInput.css` — dead dock/form/textarea rules removed, new `.ai-side`/`.ai-workspace`/`.ai-orb-float`+`.ai-info-card` rules added, dark-mode covered. Verified live via `vercel dev` + chrome-devtools MCP (light + dark, Edit-text mode, Match-a-job mode, info card open/close).

**Still owed from part 4** (below) — not touched this session:

1. **Test coverage +45** (`3462658`) — new `ResumeContext.test.jsx` (CRUD, persistence, corrupt-JSON hydration, immutability, dark mode, mock auth), `toolbarUtils.test.js`, `layouts.test.jsx` (Modern/Compact partitioning). **Refactor:** extracted the fragile font-size/family helpers + FONTS/SIZES out of `EditorToolbar.jsx` into new pure `src/lib/toolbarUtils.js` (import-only change) to make them testable. Still untested: Editor (contentEditable — needs jsdom execCommand shims or Playwright), 4 simpler layouts, EditorToolbar render.
2. **Quiz → tailor bridge** (`be142ce`) — in AI Assist → **Match a job**, a "🎯 Take the quiz" button opens the Interest Profiler; picking a matched career fetches its real O*NET duties and prefills the posting box (degrades to the title if duties can't load; empty box fills silently, non-empty replaces + notice). New pure `occupationToPosting()` in `onet.js`; `InterestProfiler` got an optional `onPickCareer(career)` prop (dashboard "Start a résumé" path unchanged). +10 tests. CONTEXT.md updated (3 AI modes; **Job match** + **Interest Profiler** terms).
3. **OpenCode Zen provider + Groq fallback** (`a51706e`) — `api/ai.js` is now a 2-provider proxy. Tasks declare a `tier` (small→`deepseek-v4-flash-free`, large→`nemotron-3-ultra-free`); other free models `mimo-v2.5-free`/`north-mini-code-free` noted in-code. Providers tried in order, only if their key is set (Groq-only = old behavior). Fallback on non-2xx / network / empty / (JSON tasks) bad-shape. **All 4 free models are REASONING models** — verified live they burn 1100–1900+ tokens on hidden reasoning before content; `REASONING_HEADROOM = 2000` keeps output from truncating to empty (ceiling only, no Groq cost). +9 tests.
4. **AI consent copy fix** (`058b14e`) — dropped stale "Groq's AI" wording (say "the AI service"); on a **contact** section the consent line + tips were contradictory (nothing is actually sent there) — now one accurate on-device line, removed the redundant banner + irrelevant grounding tip.
5. **O*NET list scroll fix** (`ee3da30`, unpushed) — `.onet-panel` scrolled as a whole; now it fills the dock and only `.onet-results`/`.onet-tasks` scroll internally.
6. **Import "AI failed" fix** (`e3291ca`, unpushed) — nemotron's JSON mode can return valid-but-wrong-shape JSON (e.g. `{"html":…}`), which passed the parse-only check and beat Groq → client found no `sections`. JSON tasks now declare a required key (`import`→`sections`, `tailor`→`matched`); missing it falls through to Groq.

**LIVE-VERIFY STILL OWED (needs `vercel dev` + browser):** OpenCode **streaming** on reasoning models (improve/ideas/format/polish/retarget via `streamAi`) — content deltas should arrive after reasoning deltas, buffered-fallback covers it, but not browser-exercised. Also confirm prod `/api/ai` actually hits `opencode.ai` (200) and isn't silently always-falling-back to Groq (would mean headroom still too tight). Quiz→tailor full 30-Q→results→pick flow is stubbed in tests, only runs live.

**SHIPPED THIS SESSION — 2026-07-07 (part 3) — AI-surface review + hardening (tests 182 → 197):**

_Deep code review of the whole AI surface (parallel react + security reviewers), then fixes. All Groq round-trips re-verified live via `vercel dev`._

- **XSS fix (CRITICAL)** — `bulletsFromTasks` (`src/lib/onet.js`) interpolated task strings raw into `<li>`; a crafted job posting could steer the `tailor` model into emitting markup rendered via `dangerouslySetInnerHTML`. Now HTML-escapes every task; **and** `Editor.applyAiToSection` sanitizes centrally at the section-write boundary (defense in depth — no call site can forget).
- **Stale-apply fix (CRITICAL)** — the AI dock kept a preview generated for a previous section; applying after switching sections silently overwrote the wrong section. Dock state now resets on section change and `applyResult` is guarded by the originating section id.
- **Streaming/abort races (HIGH)** — `AiInput.runTask` now uses a `requestId` + `AbortController` (only the latest request touches state); `OnetSuggest`/`JobTailor` got `AbortController` + mounted-guards and abort on tab-switch/unmount; mode tabs disabled while busy; `pickOccupation` race-guarded.
- **PII → Groq, contact section (H2)** — "Format" on a `contact` section now runs **fully on-device** via new pure `src/lib/contactFormat.js` (name/email/phone/links, phone normalized) — the minor's PII never leaves the browser. Improve/Suggest-ideas are disabled on contact sections (they'd send PII and aren't useful there). **Grammar stays on-device (harper.js), as always.**
- **`api/ai.js` hardening (M1)** — `Object.hasOwn` guards on `TASKS`/`FORMAT_HINTS` lookups kill the `__proto__`/`constructor` allow-list + length-cap bypass (verified live → 400).
- **`sanitizeHtml` (M3)** — dropped `style` from the allow-list (CSS-beacon vector); added an `afterSanitizeAttributes` hook forcing `rel="noopener noreferrer"` on any `target="_blank"`.
- **Security headers + CSP (M2)** — `vercel.json` now sets CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` (verified live). **CSP must keep** `fonts.googleapis.com`/`fonts.gstatic.com` (EB Garamond in `index.html`), `'wasm-unsafe-eval'` (harper.js), `worker-src blob:` (pdf.js).
- **Server-side rate limiting (H1, best-effort)** — new `api/_rateLimit.js` per-IP sliding window on all three Edge proxies (ai 30/min, onet+onetip 60/min). **LIMITATION:** module-scope state is per warm isolate — a real speed-bump on prod, but NOT a hard distributed guarantee, and it does **not** accumulate under `vercel dev` (dev reloads the fn per request, so it can't be verified locally). Swap the Map for Vercel KV/Upstash for a strict limit (drop-in — same `checkRateLimit` contract).
- **a11y** — `aria-live`/`role=alert` on all AI status/error/result regions; `InterestProfiler` got `role=dialog`, `aria-modal`, Escape-to-close, focus-on-open.
- **AI UX** — daily-budget indicator ("N of 25 left today"), client length pre-flight (friendly message instead of a post-hoc 413), error "Try again" button, ideas↔O*NET grounding nudges on both tabs, JobTailor clears stale analysis before a retry, `tailor.js` dedupes lists (kills duplicate React keys).
- **Deps (M4)** — bumped `react-router-dom` 7.14 → 7.18 + `npm audit fix` → **0 vulnerabilities** (was 1 high/1 mod/1 low).

**Still open after this session:** H1 is best-effort only (provision KV for a hard limit). H2 residual: improve/ideas on *non-contact* sections still send text to Groq verbatim (by design; consent shown) — broaden `scrubPii` or confirm Groq zero-retention if pursued. Lower: `InterestProfiler` radiogroup lacks arrow-key roving-tabindex; contentEditable + toolbar `createLink` still store raw (self-XSS class, single-user). See memory `project-ai-security-followups`.

**SHIPPED EARLIER THIS SESSION — 2026-07-07 (part 2) — all TDD, pushed to `master`:**

7. **Fuller "Real job duties"** (`a2766f2`) — the My Next Move `on_the_job` list is only ~3 items. `api/onet.js` occupation action now makes a **2nd call** to `/online/occupations/{code}/details/tasks?end=20`, ranks **Core-first then by importance**, caps at 15, and prefers it over `on_the_job` (silent fallback if that endpoint fails). New pure normalizer `normalizeOnlineTasks` (in `onetNormalize.js`) + tests. Verified live: Waiters 3 → 15 tasks.
8. **AI dock square** (`a2766f2`) — expanded AI Assist panel `540×340 → 540×540` (`FORM_HEIGHT` in `AiInput.jsx`).
9. **Format cap raised** (`a2766f2`) — `format` task was rejecting full sections ("Text is too long (max 2000)"). Bumped `maxInput` 2000→6000 and `maxTokens` 600→1200 in `api/ai.js`. **Note: `improve`/`grammar` still cap at 2000** — same use case; bump if reported.
10. **Interest Profiler UX** (`e0db863`) — quiz now serves **one question at a time** (large prompt, stacked options, auto-advance, Back/Next, "Question X of 30"). Modal widened `620→760px`. **Dark-mode contrast fixed** (modal bg `#0F172A`; text lifted to light, option/bar/career surfaces restyled).
11. **Vercel env + prod deploy** — `ONET_API_KEY` + `GROQ_API_KEY` set (encrypted) in all 3 Vercel envs; **prod redeployed** (`vercel --prod`). Gotcha found: piping a key through PowerShell to `vercel env add` appends `\r` and corrupts it (caused a 502) — **re-add O*NET keys from bash (LF-only)**. `vercel dev` also **rewrites `.env.local`** on start by pulling cloud env, so keys must live in the cloud Development env or they get stripped.

**SHIPPED EARLIER THIS SESSION — 2026-07-07 (part 2) — all TDD, pushed to `master`:**

1. **Version indicator** — `package.json` version bumped `0.0.0 → 0.1.0`; injected at build time via Vite `define` (`__APP_VERSION__`, single source = package.json) → surfaced through `src/version.js` (`APP_VERSION`) as a subtle pill by the logo on the landing nav. Bump `package.json` to update everywhere.
2. **O*NET search relevance fix** — `searchOccupations` (seed fallback) matched raw substrings, so `"it"` surfaced Waiters/Childcare/Recreation ("wa**it**ers", "babys**it**ter", "activ**it**ies"). Now matches **whole-word prefixes** (`wordStartsWith`) — `cash`→Cashiers works, `it`→nothing. Added empty-state hint in `OnetSuggest.jsx`. Live O*NET path (via `vercel dev`) is unaffected; this only cleaned the seed. **Note: the live remote path only runs under `vercel dev`; plain `npm run dev` doesn't serve `/api`, so search falls back to the 10-job seed** (which has no IT/tech roles — that's why the seed looked broken).
3. **Interest Profiler quiz (O*NET Mini-IP, live)** — new career-discovery feature. Dashboard button **"🎯 Find a job that fits"** → `InterestProfiler.jsx` modal → 30-question Mini-IP (5-point like/dislike) → RIASEC score bars + top-interest blurb → matched careers (🌟 Bright Outlook badges) → **"Start a résumé"** per career (`createResume("<Career> Resume")` → editor). Result cached in `localStorage` (`resbuilt_ip_result`) so reopening lands on results with a **Retake** option. **Privacy: no PII sent** — only the anonymous answer-digit string goes to O*NET. Same v2 API + `ONET_API_KEY` as the duties feature (no separate signup). Files: proxy `api/onetip.js` (GET-only; assembles all 30 questions across pagination, scores, matches careers, whitelists only the 6 RIASEC params), pure normalizers `src/lib/onetIpNormalize.js`, client repo `src/lib/onetIp.js`. Verified end-to-end against the live API (varied answers → real scores → matched careers). **Limit: no job-zone filter** (O*NET's `job_zone` param on this endpoint is unreliable; full filtering is on their H1-2026 roadmap), so career lists can include high-education roles (e.g. Chiropractors) — acceptable for MVP, easy to add later behind the same interface. **Needs `vercel dev` to run live.**

**SHIPPED PREVIOUSLY THIS DAY — 2026-07-07 (part 1) — all TDD, pushed to `master`:**

1. **Section-aware "Format" button** (`d3778a4`) — 4th AI action in the "Edit my text" tab. Reformats the active section into the conventional résumé layout for **its `type`**: contact → name + clean email/phone(normalized)/location/links; education → "**School** — City, State — Year"; experience → "**Title**, Employer — dates" + duty bullets; skills → skill list; summary → tight `<p>`; projects/certifications → named headings; else → generic bullets. Client sends `section.type`; proxy (`api/ai.js`) appends the matching `FORMAT_HINTS[type]` to the base `format` prompt. Groq 8B, HTML, streamed, sanitized. Result cache is keyed on section type. All prompts forbid inventing facts.
2. **Tooltips** (`d3778a4`) — `title` + `aria-label` on all 4 task buttons and the 3 mode tabs; mode tabs refactored into a `MODE_TABS` map.
3. **Live O*NET v2 API** (`b392993`) — "Real job duties" now calls the live **O*NET Web Services v2** (`https://api-v2.onetcenter.org`, `X-API-Key` header, GET only) via a new server-side Edge proxy `api/onet.js`, **with the seed as offline fallback**. Search → `/mnm/search` (`career[]`); details → **one** `/mnm/careers/{code}/` call (`on_the_job` → tasks, `also_called` → keywords, `title`). Pure normalizers in `src/lib/onetNormalize.js` (verified against live JSON). Client helpers `searchOccupationsRemote` / `getOccupationRemote` in `onet.js`. `OnetSuggest.jsx` is **remote-first + seed fallback**, debounced 300ms search. **Verified end-to-end against the live API.** `ONET_API_KEY` set in `.env.local` (+ needs adding to Vercel env for prod). Consent line now notes the search query is sent to O*NET.

**FOUNDATION + PRIOR SESSIONS (all TDD, on `master`):**

1. **Multi-format Import** (`0f5ca37`, `3711275`) — Dashboard "📥 Import a résumé" → `ImportModal` consent gate → **on-device text extraction** → one Groq `import` call (JSON mode) → validated `sections[]` → new Résumé (Classic) → Editor. Supports **PDF (pdf.js), Word .docx (mammoth), .txt, .md** — all lazy-loaded; legacy `.doc` rejected with guidance. Modules: `pdfImport.js` (guards: `fileKind`/`validateImportFile`), `fileExtract.js` (format dispatch), `pdfExtract.js`, `importSections.js` (AI-JSON→Sections), `importResume.js` (`importResumeFromFile`, injectable deps). Context: `createResumeFromImport`.
2. **On-device grammar** (`3f5a6ca`) — "Fix grammar" runs in-browser via **harper.js WASM** (lazy; ~8 MB first load, then cached). Nothing sent, no Groq quota. `grammarFix.js` (`correctText` + `fixGrammarInHtml`, preserves tags), `harperLinter.js`. Improve/Ideas still Groq.
3. **O*NET grounding** (`3f5a6ca`, `905cbfc`) — "Real job duties" tab: search job → pick → check real O*NET tasks → **Add selected** (verbatim, on-device) or **✨ Make it mine** (Groq `polish`). `onet.js` repository (swappable), `onetData.js` seed (**10 occupations only** — full extract per `docs/onet-extract.md`), `OnetSuggest.jsx`. Attribution: landing footer + editor credit, logo self-hosted at `public/onet/`.
4. **AI improvements** (`53a0fb6`→`ef2bb00`):
   - **Security** — `sanitizeHtml.js` (DOMPurify) on ALL AI/imported HTML. **XSS risk from §10 is now mitigated at write-time** (AiInput results, OnetSuggest polish, importResumeFromFile).
   - **Quota** — model routing (`api/ai.js`: editing tasks → `llama-3.1-8b-instant`, import → `llama-3.3-70b`); `aiCache.js` (localStorage result cache); `aiBudget.js` (soft 25/device/day cap); import cap trimmed 15k→8k.
   - **Grounding** — `scrubPii.js` (email/phone/URL redaction, applied to Ideas only); Ideas grounds on the selected O*NET occupation.
   - **Job tailor** — "Match a job" tab (`JobTailor.jsx`): paste posting → gap analysis (matched/missing/suggestions) via `tailor` task + optional grounded rewrite via `retarget` task. `tailor.js` parser. Scopes to the **active section**.
   - **UX** — undo toast after any AI edit (Editor `undoAiEdit`, 8s); Improve/Ideas **stream** token-by-token (`streamAi.js`, opt-in `stream` flag in `api/ai.js`).

**Groq round-trips VERIFIED live (2026-07-07 part 3)** via `vercel dev` + `curl`: `improve`, `format` (per-section-type), `ideas`, `tailor` (JSON), `import` (70B JSON), SSE streaming, and the 413 length cap all confirmed against real Groq. Still **not** browser-exercised end-to-end: pdf.js/mammoth/harper *output* rendering and `.docx` parse (logic + build verified only).

**Open / next:**
- **Rate limiting is best-effort only (H1)** — `api/_rateLimit.js` is module-scope per warm isolate: a speed-bump, NOT a hard limit, and it does **not** accumulate under `vercel dev` (fn reloads per request → unverifiable locally). For a strict distributed limit, swap the Map for Vercel KV/Upstash — drop-in, same `checkRateLimit(req,{limit})` contract; needs a KV store + `KV_REST_API_URL`/`KV_REST_API_TOKEN` in Vercel.
- **PII → Groq residual (H2)** — contact-section Format is now on-device (`contactFormat.js`); but improve/ideas on *non-contact* sections still send section text to Groq verbatim (by design, consent shown). Broaden `scrubPii` or confirm Groq zero-retention if pursued.
- **a11y leftover** — `InterestProfiler` radiogroup uses `role=radio` on plain buttons without arrow-key roving-tabindex (APG mismatch); implement roving tabindex or drop the radio roles for `aria-pressed`.
- **Raw-store paths (self-XSS class, single-user)** — `Editor.handleEditorInput` (contentEditable) and toolbar `createLink` still store unsanitized HTML/`javascript:` URLs. Sanitize these too before any shared-link/multi-user feature.
- **~~ADR 0001 still unwritten~~ DONE (2026-07-07 part 7)** — `docs/adr/0001-resume-text-to-hosted-ai.md` (Accepted); ADRs 0002–0009 cover the AI-gap approaches.
- **~~Add `ONET_API_KEY` to Vercel prod env~~ DONE (2026-07-07)** — `ONET_API_KEY` + `GROQ_API_KEY` now set (encrypted) in all three Vercel environments (Production/Preview/Development) via `vercel env add`. A production **redeploy** is still needed to pick up the new prod vars. `vercel dev` now pulls both keys into `.env.local` on start (they no longer get stripped).
- **O*NET tasks are ~3 per job** — the v2 `mnm` endpoint's `on_the_job` list is short by design (teen-friendly). If you want the full task bank, use the bulk DB (`docs/onet-extract.md` Option A) behind the same `onet.js` interface.
- **Daily AI cap is per-browser localStorage** — a soft guard, not server-enforced.
- **Job-tailor + O*NET grounding are per-section** (the dock only sees the active section); whole-résumé versions are clean future extensions.
- **Streaming falls back** to buffered if the env doesn't stream — verify once on Vercel.
- Still untested: Editor, layouts, context, toolbar. `README.md` still stock Vite.
- Other roadmap (TASKS.md): inline content guidance per section; mobile-responsive editor; dashboard rename/sort/last-edited.

---

## 1. Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
npm run preview  # serve the build
npm run lint     # eslint
npm test         # vitest (watch)  ·  npm run test:run (once)  ·  npm run coverage
```

Vitest: 135 tests, jsdom env. No CI. Deploys to Vercel (`vercel.json` rewrites all routes → `index.html` for SPA client routing).

---

## 2. Stack

| Concern | Choice |
|---|---|
| Framework | React 19, Vite 8 (`@vitejs/plugin-react`, Oxc) |
| Routing | react-router-dom 7 (`BrowserRouter`) |
| State | Single Context — `src/context/ResumeContext.jsx` |
| Persistence | `localStorage` (keys `resbuilt_user`, `resbuilt_resumes`, `resbuilt_darkmode`) |
| Drag/drop | `@dnd-kit/*` (section reorder in editor) |
| Animation | `framer-motion` |
| UI primitives | `@radix-ui/react-dropdown-menu`, `@radix-ui/react-icons`, `lucide-react` |
| Styling | Plain CSS per component. Theme via `data-theme="dark|light"` on `<html>` + CSS custom props. No CSS framework. |
| AI proxy | Vercel Edge fn `api/ai.js` → Groq (OpenAI-compatible) |
| Import/parse | `pdfjs-dist` (PDF), `mammoth` (.docx) — both lazy |
| On-device | `harper.js` (grammar WASM), `dompurify` (sanitize) |
| Tests | `vitest` + `@testing-library/react`, `jsdom` env |

Palette: **"Paper & Ink"** (2026-07-07 redesign) — warm paper `--bg:#F6F5F1`, ink `--ink:#1B1D23`, single flat cobalt accent `--accent:#3B5BDB`; EB Garamond display via `--font-display`. Tokens in `src/index.css`. **Banned: gradients, emoji, glow shadows, raw indigo `#6366F1` family.** Résumé layout CSS (`components/layouts/`) is exempt (document styling).

---

## 3. Routes & pages

| Route | File | Notes |
|---|---|---|
| `/` | `src/pages/Landing.jsx` | Marketing landing (light editorial, serif hero) |
| `/dashboard` | `src/pages/Dashboard.jsx` | Home. Resume grid, create (with starter picker)/delete/duplicate, business-card modal (mock) |
| `/editor/:id` | `src/pages/Editor.jsx` | Main workspace (see §5) |
| `*` | `src/pages/NotFound.jsx` | 404 |

No route guards, none needed — no-account is intentional. Landing "Get started" → `/dashboard` directly. `/editor/:id` redirects to `/dashboard` only if the resume id is not found.

---

## 4. State model (`ResumeContext.jsx`)

One provider wraps the whole app. Exposes:

- `user`, `login(email, pw, name)`, `logout()` — **mock, currently unused by the UI** (login page is unlinked). Kept for a possible future opt-in sync.
- `resumes`, `createResume(title, starterId)`, `updateResume`, `deleteResume`, `duplicateResume`, `getResume`
- `darkMode`, `setDarkMode`

Three `useEffect`s mirror `user` / `resumes` / `darkMode` into `localStorage` on change.

**Resume shape:**
```js
{
  id, title, lastEdited,          // lastEdited is stored but not shown on cards yet
  sections: [{ id, title, type, content /* HTML string */, hidden? }],
  styles: {
    fontFamily, fontSize, lineSpacing, sectionSpacing,
    marginTop/Right/Bottom/Left, paperSize, template, accentColor
  }
}
```
`content` is raw HTML (produced by contentEditable) and rendered via `dangerouslySetInnerHTML`.

**Content starters (`src/config/starters.js`):** the section set + example wording a new resume begins with — separate from visual layout (§6). `createResume(title, starterId)` picks one; default `student`. Five presets: `student`, `internship`, `it`, `entryLevel`, `professional`. The New Resume modal in `Dashboard.jsx` renders a card per `Object.values(STARTERS)` — add a preset there and it appears automatically. Section `type`s used: `contact`, `summary`, `education`, `experience`, `skills`, `projects`, `certifications`, plus `activities` / `volunteer` / `awards` / `availability` (these land in the main column on all layouts). Content is aimed at first-time writers — no fabricated senior credentials.

---

## 5. Editor architecture (`src/pages/Editor.jsx`) — the core

Four-column layout: **sections sidebar | contentEditable editor | live preview | styles sidebar**. Both sidebars collapse.

**Editing pattern (important, subtle):**
- The editor is an **uncontrolled `contentEditable` div** driven by `editorRef`.
- A `useEffect` writes `section.content` into `innerHTML` **only when the active section changes** — not on every keystroke. This is deliberate: it prevents cursor-jump.
- `onInput` reads `innerHTML` back into React state (`handleEditorInput`).
- Switching sections flushes the current DOM into state first (`switchSection`).

**Autosave:** `scheduleAutoSave` debounces 900ms → `updateResume`. `patch(updater)` is the standard state-update helper (updates local `resume` + schedules save). `saveNow` flushes immediately (Save button).

**Sections:** add / rename / delete (with confirm modal + 5s undo toast) / duplicate / hide (`hidden` flag) / drag-reorder (dnd-kit `SortableSectionItem`). Move-up/down helper (`moveSection`) exists but isn't wired to UI.

**Styles sidebar:** template picker (CSS-drawn thumbnails inline in this file), accent color, font family, font size, line spacing, section spacing, and — for non-sidebar templates only — margin presets + per-side margins.

**`applyTemplate`** merges `template.defaultStyles` over current styles and sets `template` + `accentColor`.

---

## 6. Templates & layouts

`src/config/templates.js` defines 6 templates → `src/components/layouts/`. To add one: layout component + CSS, a `templates.js` entry, a `LayoutSwitch` case in `ResumePreview.jsx`, and a thumbnail branch in `Editor.jsx`'s `TemplateThumbnail`.

| Template | `layout` | Layout component |
|---|---|---|
| Classic | `classic` | `ClassicLayout` — single column, margins as padding |
| Modern | `sidebar` | `ModernLayout` — two-column, **full-bleed** (no margins). Sections split sidebar vs main by `type` (`sidebarSectionTypes: contact/skills/certifications`) |
| Minimal | `minimal` | `MinimalLayout` — whitespace, sans-serif |
| Executive | `executive` | `ExecutiveLayout` — accent header banner + single column |
| Compact | `twocol` | `CompactLayout` — full-width header + light two-column (`MAIN_TYPES` = summary/experience/education/projects → wide col; rest → side col) |
| Timeline | `timeline` | `TimelineLayout` — accent vertical line + dot per section |

Only `sidebar` is full-bleed (`isSidebar` in `ResumePreview.jsx` keys off `layout === 'sidebar'`); the rest respect page margins and use the standard overflow/page-count path.

`ResumePreview.jsx` picks the layout via `LayoutSwitch`, scales the paper (`transform: scale`) to fit or to zoom, and measures content overflow with a `ResizeObserver` to report **page count** and show an overflow warning. Sidebar layout is exempt from overflow/margin logic.

Paper sizes + margin presets: `src/config/paperSizes.js`.

---

## 7. Toolbar (`EditorToolbar.jsx`)

Rich-text via legacy `document.execCommand` (bold/italic/underline/strike/align/lists/link/fontName). Active-state tracking via `queryCommandState` on `selectionchange`.

**Font size is custom** (`applyFontSize`): `execCommand('fontSize', '7')` inserts marker `<font size="7">`, which is then swapped for `<span style="font-size:Npt">`. Selection is restored afterward. This is the fragile part — see risks.

---

## 8. PDF export (`exportPDF` in `paperSizes.js`)

No PDF library. It clones the `.preview-paper` DOM node, inlines **all** stylesheet rules via `collectCSS()`, opens a new window, writes the HTML with `@page` size + `print-color-adjust: exact`, and calls `window.print()`. User picks "Save as PDF" in the browser dialog. Fails gracefully if pop-ups blocked or preview missing.

---

## 9. Mocked / placeholder features

- **Auth** — mock and **unused**. Login page **deleted** (2026-07-07; no-account is the product). `ResumeContext` still exports `user/login/logout` for a possible future opt-in sync. No backend.
- **AI Assist** — **live** (free). `AiInput.jsx`, three tabs: **Edit my text** (Improve / Fix grammar / **Format** / Suggest ideas), **Real job duties** (O*NET, live v2 API), **Match a job** (job-posting tailor). Controls (mode tabs + task buttons) live in the **sections sidebar**; the textbox/answers workspace lives in the **editor column**, both sharing one `AiProvider` context — no floating dock anymore (the corner orb is now a click-for-info privacy card, see §5). All buttons + tabs have tooltips. Calls `api/ai.js` (Vercel **Edge** proxy) → **OpenCode Zen** (primary) → **Groq** (fallback).
  - **On-device (nothing sent):** Fix grammar (harper.js WASM), "Add selected" O*NET duties, contact-section Format. Everything else sends text to the AI service → consent notices shown.
  - **Quota guards:** `aiCache.js` (localStorage result cache), `aiBudget.js` (25 AI actions/device/day soft cap), `scrubPii.js` (redacts PII on Ideas). Improve/Ideas **stream** (`streamAi.js`).
- **Business Cards** (Dashboard) — modal says "coming soon".

**AI setup / running it:**
- Free key at console.groq.com → set `GROQ_API_KEY`. See `.env.example`.
- **Local:** `vercel dev` (NOT `npm run dev` — Vite doesn't run `/api`). **Prod:** add `GROQ_API_KEY` in Vercel env vars.
- `.env` / `.env.*` are gitignored (except `.env.example`) — never commit the key.
- Privacy tradeoff (minors): text sent to Groq for import/improve/ideas/polish/tailor. Grammar is on-device (harper.js).

---

## 10. Known risks / gotchas

- **XSS — now mitigated at write-time:** all AI/imported HTML is run through `sanitizeHtml.js` (DOMPurify allow-list) before entering section state. Note: user-typed contentEditable content is still stored raw (trusted, single-user). Before any shared-link/multi-user feature, also sanitize at render/print time as defense-in-depth.
- **`execCommand` is deprecated** — works in all current browsers but is the toolbar's foundation. Font-size marker-swap hack (`applyFontSize`) is the most brittle path.
- **localStorage only** — by design (privacy). Clearing storage wipes everything; no cross-device sync; ~5MB cap. Warn users before adding anything that assumes durability.
- **Bundle:** main chunk ~180KB gzip. Heavy libs (pdf.js, mammoth, harper.js WASM ~8MB gzip) are **lazy-split** — only load when their feature is first used. Build warns on the pdf.worker/harper chunks; expected.
- **Tests: 135 passing** (`npm run test:run`). Vitest env is **jsdom** (`vite.config.js`) — required for DOMPurify. Covered: all import/AI **logic + utils** (guards, extractors, normalizers, cache, budget, PII, tailor, streaming SSE parsers, sanitizer) + component tests for ImportModal / OnetSuggest / JobTailor. **Still untested:** Editor, layouts, ResumeContext, toolbar. No E2E/Playwright yet.
- **Pre-existing lint error** — `ResumeContext.jsx` exports `useResume` (a hook) beside the provider, tripping `react-refresh/only-export-components`. Present at HEAD; harmless (dev HMR only). Fix by moving the hook to its own file if it bothers you.

---

## 11. What's next (from `TASKS.md`)

Roadmap lives in [TASKS.md](TASKS.md) (paywalls already stripped — everything is free). Highlights by priority for this audience:

- **High:** inline "not sure what to write?" content guidance per section (biggest value — see §0); mobile-responsive editor; free Template Builder (customize a template's colors/fonts/columns/headings/spacing, save as named custom template).
- **AI (free, cost-controlled):** bullet-point suggestions, summary generator — wire into the `AiInput` sidebar/workspace. Job-targeting / ATS analysis de-prioritized for this audience.
- **Medium/Low:** dashboard rename-on-card, sort, last-edited timestamp (stored, unshown); search/filter; spell-check (offline nspell or LanguageTool API); word count; undo history; shareable view-only link (needs HTML sanitization first — see §10).
- **Deferred:** cloud backend is **not** a default — localStorage is the privacy feature. Only add as opt-in sync, no PII from minors (COPPA/GDPR-K).

> Note: `README.md` is still the stock Vite template readme — not project docs. This file + TASKS.md are the real docs.

---

## 12. File map (quick reference)

Most `src/lib/*.js` have a co-located `*.test.js`. Test env: jsdom.

```
api/
├── ai.js                       # Vercel Edge proxy → Groq. TASKS map (per-task model/caps/prompt);
│                               #   tasks: improve, ideas, grammar, format, polish, tailor, retarget
│                               #   (8B), import (70B, JSON). format appends FORMAT_HINTS[sectionType].
│                               #   Opt-in `stream` passthrough for HTML tasks.
├── onet.js                     # Vercel Edge proxy → O*NET v2 (X-API-Key). search + occupation.
└── onetip.js                   # Vercel Edge proxy → O*NET Interest Profiler v2 (shares ONET_API_KEY).
                                #   actions: questions (all 30), results (score), careers (match).
docs/
├── onet-extract.md             # how to replace the O*NET seed with full DB / live API
└── adr/                        # 0001 PII→AI trade-off (Accepted); 0002–0009 AI-gap
                                #   approaches (Accepted — pending). README.md = index.
public/onet/                    # self-hosted O*NET "in-it" logo (svg + png)
src/
├── App.jsx  main.jsx
├── context/ResumeContext.jsx   # all state + persistence; createResume / createResumeFromImport
├── config/
│   ├── templates.js  paperSizes.js  starters.js
│   └── onetData.js             # O*NET occupation SEED (10 jobs, CC BY 4.0) — swap per docs/
├── pages/  Landing Dashboard Editor NotFound  (+ .css each; Login deleted 2026-07-07)
├── components/
│   ├── EditorToolbar.jsx  ResumePreview.jsx  ResumeCard.jsx
│   ├── ImportModal.jsx         # multi-format import consent gate + UI
│   ├── layouts/                # Classic, Modern, Minimal, Executive, Compact, Timeline
│   └── ui/                     # AiInput (sidebar controls + editor workspace, 3 tabs), OnetSuggest, JobTailor,
│                               #   InterestProfiler (Mini-IP quiz modal),
│                               #   AccentColorPicker, SelectDropdown, dropdown-menu, switch
└── lib/
    ├── utils.js
    ├── sanitizeHtml.js         # DOMPurify allow-list (all AI/imported HTML)
    ├── pdfImport.js            # fileKind + validateImportFile + assessExtractedText
    ├── fileExtract.js          # format dispatch → pdfExtract / mammoth / text (lazy)
    ├── pdfExtract.js           # lazy pdf.js
    ├── importSections.js       # AI-JSON → normalized Sections (one contact, first)
    ├── importResume.js         # importResumeFromFile orchestrator (injectable deps)
    ├── grammarFix.js  harperLinter.js   # on-device grammar (harper.js WASM)
    ├── onet.js                 # occupation repository: seed search/getOccupation + live
    │                           #   searchOccupationsRemote/getOccupationRemote (→ api/onet.js)
    ├── careerSeed.js           # quiz→résumé seeding: fetchOccupationForCareer (live→seed→null)
    │                           #   + seedSectionsFromOccupation (duties→Experience, skills→Skills)
    ├── onetNormalize.js        # pure normalizers for O*NET v2 JSON (career[], on_the_job…)
    ├── onetIp.js               # Interest Profiler client repo (→ api/onetip): isValidAnswers,
    │                           #   fetchProfilerQuestions / scoreAnswers / matchingCareers
    ├── onetIpNormalize.js      # pure normalizers for Interest Profiler v2 JSON + scoresToCareerQuery
    ├── version.js              # APP_VERSION (Vite-injected __APP_VERSION__ from package.json)
    ├── tailor.js               # parseTailorResult (job-match analysis)
    ├── scrubPii.js  aiCache.js  aiBudget.js  streamAi.js   # AI quota/privacy/streaming utils
    └── ...
```
