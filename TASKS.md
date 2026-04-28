# ResBuilt — Tasks & Changelog

## To-Do

### Auth
- [Critical] Remove skip login button before shipping - Fix
- [High] Replace mock auth with real authentication - Feature
- [Medium] Add user profile / account settings page - Feature

### Dashboard
- [High] Add delete confirmation modal (match editor pattern) - Fix
- [High] Add sort button — by name, date created, last edited - Feature
- [High] Show last-edited timestamp on resume cards - Feature
- [Medium] Add rename resume option on card (currently title locked after creation) - Feature
- [Medium] Add search / filter bar for resumes - Feature
- [Low] Add drag-to-reorder resume cards - Feature

### Editor
- [Medium] Add undo for section content (beyond last-deleted toast) - Feature
- [Low] Add word / character count indicator - Feature

### Templates & Styling
- [High] Template Builder (paid tier) — customize colors, fonts, column widths, heading styles, section order, spacing → save as named custom template - Complex Feature
- [Medium] Allow per-resume accent color to show on dashboard card thumbnail - Feature

### Export & Sharing
- [High] PDF export - Feature
- [Medium] View-only shareable link for resume - Feature

### Infrastructure
- [High] Cloud persistence — replace localStorage with real backend - Complex Feature

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
