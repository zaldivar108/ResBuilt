# ResBuilt — Project Handoff

_Last updated: 2026-07-07 · Branch `master` · Build: green · Tests: 197 passing · npm audit: 0 vulns · v0.1.0 · Prod: https://resbuilt.vercel.app (live, deployed)_

**Purpose (locked):** a **free** resume builder for **teenagers & young adults** building their first resume — school, part-time jobs, internships, college apps. No paywalls. Privacy-first: **no account required**, data stays on the device.

A client-side resume builder. React 19 + Vite 8. All data lives in `localStorage` (that's the privacy feature, not debt). **AI Assist is live** (Groq proxy + on-device harper.js/O*NET); business cards are mocked; auth is optional/unused.

---

## 0. Session status — where to continue

**Test suite: 182 passing** (`npm run test:run`). Build green throughout. Vitest env is **jsdom** (DOMPurify's reference DOM). Lint: **20 errors, all pre-existing** (Editor/toolbar/AccentColorPicker + the `useResume` react-refresh one) — none from this session's work. **Production is deployed & verified live at https://resbuilt.vercel.app** (all `/api` proxies return 200: ai/onet/onetip).

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
- **ADR 0001** still unwritten — "privacy-first app deliberately sends full-résumé PII to Groq for import." Write `docs/adr/0001-*` if pursued.
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

Palette: indigo/violet primary `#6366F1`. Slate accents.

---

## 3. Routes & pages

| Route | File | Notes |
|---|---|---|
| `/` | `src/pages/Landing.jsx` | Marketing landing |
| `/login` | `src/pages/Login.jsx` | **Optional & unlinked.** Mock auth (login/signup toggle). Not part of the primary flow — reachable only by typing the URL. Skip-hack removed. |
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

- **Auth** — mock and **unused**. Login page unlinked from the flow (no-account is the default). No backend.
- **AI Assist** — **live** (free). `AiInput.jsx` dock, three tabs: **Edit my text** (Improve / Fix grammar / **Format** / Suggest ideas), **Real job duties** (O*NET, now live v2 API), **Match a job** (job-posting tailor). All buttons + tabs have tooltips. Calls `api/ai.js` (Vercel **Edge** proxy) → Groq. **Task→model routing:** editing/polish/tailor/retarget → `llama-3.1-8b-instant`; `import` → `llama-3.3-70b-versatile` (JSON mode). `GROQ_API_KEY` server-side only.
  - **On-device (no Groq):** Fix grammar (harper.js WASM) + "Add selected" O*NET duties. Everything else sends text to Groq → consent notices shown.
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
- **AI (free, cost-controlled):** bullet-point suggestions, summary generator — wire into the `AiInput` dock. Job-targeting / ATS analysis de-prioritized for this audience.
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
└── adr/                        # (empty — ADR 0001 on PII→Groq still to write)
public/onet/                    # self-hosted O*NET "in-it" logo (svg + png)
src/
├── App.jsx  main.jsx
├── context/ResumeContext.jsx   # all state + persistence; createResume / createResumeFromImport
├── config/
│   ├── templates.js  paperSizes.js  starters.js
│   └── onetData.js             # O*NET occupation SEED (10 jobs, CC BY 4.0) — swap per docs/
├── pages/  Landing Login Dashboard Editor NotFound  (+ .css each)
├── components/
│   ├── EditorToolbar.jsx  ResumePreview.jsx  ResumeCard.jsx
│   ├── ImportModal.jsx         # multi-format import consent gate + UI
│   ├── layouts/                # Classic, Modern, Minimal, Executive, Compact, Timeline
│   └── ui/                     # AiInput (dock, 3 tabs), OnetSuggest, JobTailor,
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
    ├── onetNormalize.js        # pure normalizers for O*NET v2 JSON (career[], on_the_job…)
    ├── onetIp.js               # Interest Profiler client repo (→ api/onetip): isValidAnswers,
    │                           #   fetchProfilerQuestions / scoreAnswers / matchingCareers
    ├── onetIpNormalize.js      # pure normalizers for Interest Profiler v2 JSON + scoresToCareerQuery
    ├── version.js              # APP_VERSION (Vite-injected __APP_VERSION__ from package.json)
    ├── tailor.js               # parseTailorResult (job-match analysis)
    ├── scrubPii.js  aiCache.js  aiBudget.js  streamAi.js   # AI quota/privacy/streaming utils
    └── ...
```
