# ResBuilt — Project Handoff

_Last updated: 2026-07-06 · Branch `master` · Build: green (`npm run build` ✓)_

**Purpose (locked):** a **free** resume builder for **teenagers & young adults** building their first resume — school, part-time jobs, internships, college apps. No paywalls. Privacy-first: **no account required**, data stays on the device.

A client-side resume builder. React 19 + Vite 8. All data lives in `localStorage` (that's the privacy feature, not debt). AI and business cards are mocked; auth is optional/unused.

---

## 0. Session status — where to continue

**Shipped & pushed to `master` this session (build green throughout):**
1. **Pivot to free/teen audience** — stripped all paywalls; auth rework (no login gate, no-account default, privacy-first framing). Login page kept but unlinked.
2. **Content starters** — `src/config/starters.js`, 5 presets in the New Resume modal (Student default / Internship / IT / Entry-Level / Professional). `createResume(title, starterId)`.
3. **3 visual templates** — Executive, Compact, Timeline (now 6 total). Template picker is a 3-col grid.
4. **AI Assist — live** (free, Groq). Per-section editing in the `AiInput` dock (Improve / Fix grammar / Suggest ideas → Apply/Add). Backed by `api/ai.js` (Vercel Edge proxy). `GROQ_API_KEY` set in all Vercel envs. See the "AI setup" note in §9.

**NEXT UP — PDF Import (fully designed, NOT built).** Grilled out this session; the resolved design is the `Import` term in `CONTEXT.md`. Summary:
- Dashboard "Import from PDF" → **pdf.js extracts plaintext in-browser** (file never leaves device) → **one** Groq call (JSON mode) → validated `sections[]` → new Résumé (default Classic, no Starter) → open Editor (= the review surface, no separate confirm screen).
- New proxy task `import` in `api/ai.js`: returns strict JSON `{ sections:[{title,type,content(HTML)}] }`; **exactly one `contact` section first, name = first `<p>`**; unknown blocks → `type:'custom'`; `max_tokens ~2000`.
- Guards: `.pdf` only, ≤5 MB; <~100 chars extracted → "scanned/image PDF" bail (no OCR); cap sent text ~15k chars.
- Privacy: client-side extraction + explicit consent gate before upload (full-résumé text → Groq; users are minors). Title = filename. Nothing created until the AI call succeeds.
- **Open:** offered but not yet written — an ADR recording "privacy-first app deliberately sends full-résumé PII to Groq for import." Write `docs/adr/0001-*` if pursued. Also need to add `pdfjs-dist` (or `pdf.js`) as a dep.

**Other roadmap (TASKS.md):** inline "not sure what to write?" content guidance; mobile-responsive editor (4-col `Editor.jsx` is desktop-only); dashboard rename-on-card / sort / last-edited; optional harper.js in-browser grammar (privacy-max, no data leaves device).

**Open / caveats:** AI import + section editing not exercised end-to-end in a browser (needs `vercel dev` + the Groq key). AI output is injected as HTML via `dangerouslySetInnerHTML` — fine single-user, sanitize before any share/multi-user. Login page orphaned. No tests. Pre-existing `useResume` react-refresh lint error (present at HEAD). `README.md` still stock Vite. New: `CONTEXT.md` is the domain glossary — keep it current.

---

## 1. Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
npm run preview  # serve the build
npm run lint     # eslint
```

No tests, no CI, no env vars. Deploys to Vercel (`vercel.json` rewrites all routes → `index.html` for SPA client routing).

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
- **AI Assist** — **now live** (free). `AiInput.jsx` dock → paste text, run Improve / Suggest ideas / Fix grammar. Calls `api/ai.js` (Vercel **Edge** proxy) → Groq free tier (`llama-3.3-70b-versatile`). Key `GROQ_API_KEY` is server-side only. Requires setup (see below); text leaves the device → consent notice shown in the dock.
- **Business Cards** (Dashboard) — modal says "coming soon".

**AI setup / running it:**
- Free key at console.groq.com → set `GROQ_API_KEY`. See `.env.example`.
- **Local:** `vercel dev` (NOT `npm run dev` — Vite doesn't run `/api`). **Prod:** add `GROQ_API_KEY` in Vercel env vars.
- `.env` / `.env.*` are gitignored (except `.env.example`) — never commit the key.
- Privacy tradeoff (minors): résumé text is sent to Groq. To keep everything on-device, the open alternative is harper.js (in-browser grammar) — see TASKS.md.

---

## 10. Known risks / gotchas

- **XSS surface:** section `content` is user HTML rendered with `dangerouslySetInnerHTML` in every layout and re-serialized into the print window. Fine for a single-user local app; **must sanitize** before any multi-user/shared-link feature.
- **`execCommand` is deprecated** — works in all current browsers but is the toolbar's foundation. Font-size marker-swap hack (`applyFontSize`) is the most brittle path.
- **localStorage only** — by design (privacy). Clearing storage wipes everything; no cross-device sync; ~5MB cap. Warn users before adding anything that assumes durability.
- **Bundle is one 546KB chunk** (173KB gzip) — no code-splitting. Build warns. Consider lazy-loading routes / framer-motion.
- **No tests at all.** TASKS.md lists a full intended Vitest + Playwright plan (none started).
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

```
api/
└── ai.js                       # Vercel Edge proxy → Groq (GROQ_API_KEY server-side only)
src/
├── App.jsx                     # routes
├── main.jsx
├── context/ResumeContext.jsx   # all state + persistence
├── config/
│   ├── templates.js            # 3 visual layout templates
│   ├── starters.js             # 5 content presets: Student(default)/Internship/IT/EntryLevel/Professional
│   └── paperSizes.js           # paper sizes, margin presets, exportPDF()
├── pages/  Landing Login Dashboard Editor NotFound  (+ .css each)
├── components/
│   ├── EditorToolbar.jsx       # execCommand rich text
│   ├── ResumePreview.jsx       # scaling, overflow/page-count, layout switch
│   ├── ResumeCard.jsx          # dashboard card
│   ├── layouts/                # Classic, Modern, Minimal, Executive, Compact, Timeline
│   └── ui/                     # AccentColorPicker, AiInput(mock), SelectDropdown,
│                               #   dropdown-menu, switch
└── lib/utils.js
```
