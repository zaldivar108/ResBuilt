# ResBuilt — Project Handoff

_Last updated: 2026-07-06 · Branch `master` · Build: green · Tests: 135 passing · HEAD `ef2bb00`_

**Purpose (locked):** a **free** resume builder for **teenagers & young adults** building their first resume — school, part-time jobs, internships, college apps. No paywalls. Privacy-first: **no account required**, data stays on the device.

A client-side resume builder. React 19 + Vite 8. All data lives in `localStorage` (that's the privacy feature, not debt). **AI Assist is live** (Groq proxy + on-device harper.js/O*NET); business cards are mocked; auth is optional/unused.

---

## 0. Session status — where to continue

**Test suite: 135 passing** (`npm run test:run`). Build green throughout. Vitest env is **jsdom** (DOMPurify's reference DOM). Lint: **20 errors, all pre-existing** (Editor/toolbar/AccentColorPicker + the `useResume` react-refresh one) — none from this session's work.

**Foundation (earlier sessions):** free/teen pivot (paywalls stripped, login unlinked); 5 content starters (`starters.js`); 6 visual templates; AI Assist dock live on Groq.

**SHIPPED THIS SESSION (all TDD, pushed to `master`):**

1. **Multi-format Import** (`0f5ca37`, `3711275`) — Dashboard "📥 Import a résumé" → `ImportModal` consent gate → **on-device text extraction** → one Groq `import` call (JSON mode) → validated `sections[]` → new Résumé (Classic) → Editor. Supports **PDF (pdf.js), Word .docx (mammoth), .txt, .md** — all lazy-loaded; legacy `.doc` rejected with guidance. Modules: `pdfImport.js` (guards: `fileKind`/`validateImportFile`), `fileExtract.js` (format dispatch), `pdfExtract.js`, `importSections.js` (AI-JSON→Sections), `importResume.js` (`importResumeFromFile`, injectable deps). Context: `createResumeFromImport`.
2. **On-device grammar** (`3f5a6ca`) — "Fix grammar" runs in-browser via **harper.js WASM** (lazy; ~8 MB first load, then cached). Nothing sent, no Groq quota. `grammarFix.js` (`correctText` + `fixGrammarInHtml`, preserves tags), `harperLinter.js`. Improve/Ideas still Groq.
3. **O*NET grounding** (`3f5a6ca`, `905cbfc`) — "Real job duties" tab: search job → pick → check real O*NET tasks → **Add selected** (verbatim, on-device) or **✨ Make it mine** (Groq `polish`). `onet.js` repository (swappable), `onetData.js` seed (**10 occupations only** — full extract per `docs/onet-extract.md`), `OnetSuggest.jsx`. Attribution: landing footer + editor credit, logo self-hosted at `public/onet/`.
4. **AI improvements** (`53a0fb6`→`ef2bb00`):
   - **Security** — `sanitizeHtml.js` (DOMPurify) on ALL AI/imported HTML. **XSS risk from §10 is now mitigated at write-time** (AiInput results, OnetSuggest polish, importResumeFromFile).
   - **Quota** — model routing (`api/ai.js`: editing tasks → `llama-3.1-8b-instant`, import → `llama-3.3-70b`); `aiCache.js` (localStorage result cache); `aiBudget.js` (soft 25/device/day cap); import cap trimmed 15k→8k.
   - **Grounding** — `scrubPii.js` (email/phone/URL redaction, applied to Ideas only); Ideas grounds on the selected O*NET occupation.
   - **Job tailor** — "Match a job" tab (`JobTailor.jsx`): paste posting → gap analysis (matched/missing/suggestions) via `tailor` task + optional grounded rewrite via `retarget` task. `tailor.js` parser. Scopes to the **active section**.
   - **UX** — undo toast after any AI edit (Editor `undoAiEdit`, 8s); Improve/Ideas **stream** token-by-token (`streamAi.js`, opt-in `stream` flag in `api/ai.js`).

**NOT exercised end-to-end in a real browser** — all AI + import needs `vercel dev` + `GROQ_API_KEY`. Logic + build verified; live round-trips (real Groq JSON, real pdf.js/mammoth/harper output, SSE streaming, `.docx` parse) unconfirmed. **Test live first.**

**Open / next:**
- **ADR 0001** still unwritten — "privacy-first app deliberately sends full-résumé PII to Groq for import." Write `docs/adr/0001-*` if pursued.
- **O*NET seed is 10 jobs** — searches outside them return nothing. Full extract path documented (`docs/onet-extract.md`); the O*NET API key is **under approval** (swap to live API or bulk DB behind the same `onet.js` interface).
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
- **AI Assist** — **live** (free). `AiInput.jsx` dock, three tabs: **Edit my text** (Improve / Fix grammar / Suggest ideas), **Real job duties** (O*NET), **Match a job** (job-posting tailor). Calls `api/ai.js` (Vercel **Edge** proxy) → Groq. **Task→model routing:** editing/polish/tailor/retarget → `llama-3.1-8b-instant`; `import` → `llama-3.3-70b-versatile` (JSON mode). `GROQ_API_KEY` server-side only.
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
└── ai.js                       # Vercel Edge proxy → Groq. TASKS map (per-task model/caps/prompt);
                                #   tasks: improve, ideas, grammar, polish, tailor, retarget (8B),
                                #   import (70B, JSON). Opt-in `stream` passthrough for HTML tasks.
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
    ├── onet.js                 # occupation repository (search / getOccupation / bulletsFromTasks)
    ├── tailor.js               # parseTailorResult (job-match analysis)
    ├── scrubPii.js  aiCache.js  aiBudget.js  streamAi.js   # AI quota/privacy/streaming utils
    └── ...
```
