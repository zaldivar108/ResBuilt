# ResBuilt — Tasks & Changelog

> **Product direction:** Free resume builder for teenagers & young adults (first resumes — school, part-time jobs, internships, college apps). No paywalls. Privacy-first: no account required, data stays on the device.

## To-Do

### Auth & Privacy
- [x] [Critical] Remove skip login button — no-account is now the default flow
- [x] Make no-account the primary path (Landing → Dashboard direct); reframe as privacy-first
- [Low] Optional accounts *only if* cross-device sync is ever added — must stay optional, never a gate. Minors = no email/PII collection (COPPA/GDPR-K). Keep localStorage as the private default.

### Dashboard
- [x] [High] Add delete confirmation modal (match editor pattern) - Fix
- [High] Add sort button — by name, date created, last edited - Feature
- [High] Show last-edited timestamp on resume cards - Feature
- [Medium] Add rename resume option on card (currently title locked after creation) - Feature
- [Medium] Add search / filter bar for resumes - Feature
- [Low] Add drag-to-reorder resume cards - Feature

### Editor
- [Medium] Add undo for section content (beyond last-deleted toast) - Feature
- [Low] Add word / character count indicator - Feature
- [Medium] Spell check — offline client-side via `nspell`/`typo.js` + Hunspell en-US dictionary; scan form fields on demand, show error list in sidebar with field + suggestions - Feature
- [Low] Spell check — LanguageTool API integration (grammar + spell); debounced REST calls, highlight errors in preview panel with `<mark>` spans; free tier 20 req/min - Feature

### AI Features (free — cost-controlled)
> Keep free. If AI cost is a concern, rate-limit or gate behind a lightweight quota, not a paywall.
- [Medium] AI bullet point suggestions — help first-time writers turn "worked at store" into a real bullet - Feature
- [Low] AI resume summary generator — auto-write a summary from resume sections - Feature
- [Low] Job-targeted tailoring — paste a job description, tailor content (lower priority for this audience) - Complex Feature
- [Low] ATS keyword gap analysis — low value for first jobs/internships; defer - Feature

### Templates & Styling
- [x] [High] Student / first-resume starter template — education-first, Activities / Volunteer / Awards sections, age-appropriate example content. Picked in New Resume modal (Student = default). Presets in `src/config/starters.js`.
- [Medium] Template Builder (free) — customize colors, fonts, column widths, heading styles, section order, spacing → save as named custom template - Complex Feature
- [Medium] Allow per-resume accent color to show on dashboard card thumbnail - Feature
- [Low] Change favicon to custom ResBuilt icon - Fix

### Export & Sharing
- [High] PDF export - Feature
- [Medium] View-only shareable link for resume - Feature

### Infrastructure
- [Low] Cloud persistence — **not** a default. localStorage is the privacy feature. Only add as opt-in sync if users ask, and without collecting PII from minors - Complex Feature

### Testing
- [High] Set up Vitest + React Testing Library — unit tests for components (ResumeCard, AccentColorPicker, AiInput, Switch) - Feature
- [High] Test ResumeContext — createResume, deleteResume, duplicateResume, darkMode toggle - Feature
- [Medium] Test Editor form fields — input changes update context, preview reflects changes - Feature
- [Medium] Test auth flow — login, logout, skip button, guest user state - Feature
- [Medium] Test Dashboard modals — delete confirmation, bizcard modal, new resume modal open/close/submit - Feature
- [Low] Set up Playwright E2E — full user flow: login → create resume → edit → preview → delete - Feature
- [Low] Test dark mode — verify CSS class toggles correctly across Dashboard and Editor - Fix

---

## Changelog

### 2026-07-06
- **3 visual templates added:** Executive (accent header banner, `layout: executive`), Compact (light two-column, `layout: twocol`), Timeline (accent vertical line + dots, `layout: timeline`). Now 6 templates. Each = layout component in `src/components/layouts/` + `templates.js` entry + LayoutSwitch case + picker thumbnail in `Editor.jsx`. All non-full-bleed (respect margins), so no preview/export plumbing changes.
- **3 role starters added:** Internship (coursework/projects-led), IT / Tech (skills + realistic entry certs like CompTIA A+ / Google IT Support), Entry-Level Job (objective + experience + availability). Now 5 presets in the New Resume picker. `src/config/starters.js`.
- **Student / first-résumé starter added.** New Resume modal now offers Student (default) vs Professional content presets. Student = education-first with Objective, Activities & Leadership, Volunteer, Awards, age-appropriate guidance text. Presets live in `src/config/starters.js`; picked via `createResume(title, starterId)`.
- **Pivot: free tool for teens & young adults.** Stripped all paywalls (AI + Template Builder now free).
- Removed mandatory login. Landing "Get started" → Dashboard directly. No account required.
- Removed skip-login hack (skipping is now the default). Login page kept but optional/unlinked.
- Reframed as privacy-first: Dashboard shows "🔒 Private · saved on this device"; landing copy + icons updated (dropped misleading cloud icon).

### 2026-04-28
- Added temporary "Skip for now →" button on Login page — bypasses auth, sets guest user, navigates to dashboard. Remove before production.
- Added TASKS.md

### Pre-session (recent commits)
- Theme consistency pass
- Dark mode improvements
- Preview size changed to slider
- Font selector fixes (text selection bug)
- Toolbar font selector edits
