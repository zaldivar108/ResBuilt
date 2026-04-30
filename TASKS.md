# ResBuilt — Tasks & Changelog

## To-Do

### Auth
- [Critical] Remove skip login button before shipping - Fix
- [High] Replace mock auth with real authentication - Feature
- [Medium] Add user profile / account settings page - Feature

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

### AI Features (Paid)
- [High] Job-targeted resume generation — user pastes job description, AI rewrites/tailors resume content to match keywords, tone, and requirements - Complex Feature
- [Medium] AI bullet point suggestions — improve weak bullet points based on role/industry - Feature
- [Medium] ATS keyword gap analysis — compare resume vs job description, highlight missing keywords - Feature
- [Low] AI resume summary generator — auto-write professional summary from resume sections - Feature

### Templates & Styling
- [High] Template Builder (paid tier) — customize colors, fonts, column widths, heading styles, section order, spacing → save as named custom template - Complex Feature
- [Medium] Allow per-resume accent color to show on dashboard card thumbnail - Feature
- [Low] Change favicon to custom ResBuilt icon - Fix

### Export & Sharing
- [High] PDF export - Feature
- [Medium] View-only shareable link for resume - Feature

### Infrastructure
- [High] Cloud persistence — replace localStorage with real backend - Complex Feature

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

### 2026-04-28
- Added temporary "Skip for now →" button on Login page — bypasses auth, sets guest user, navigates to dashboard. Remove before production.
- Added TASKS.md

### Pre-session (recent commits)
- Theme consistency pass
- Dark mode improvements
- Preview size changed to slider
- Font selector fixes (text selection bug)
- Toolbar font selector edits
