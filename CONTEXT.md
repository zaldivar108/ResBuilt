# ResBuilt

A free, privacy-first résumé builder for teenagers and young adults. Runs client-side; résumés live in the browser's localStorage. No account required.

## Language

**Résumé**:
A single document the user is building — a list of **Sections** plus **Styles**. Persisted in localStorage; never leaves the device except when a **Section**'s content is sent to AI Assist.

**Section**:
One block of a résumé (`{ title, type, content }`), where `content` is HTML. Types include contact, summary, experience, education, skills, projects, plus student-oriented ones (activities, volunteer, awards, availability). Sections can be reordered, hidden, and edited.

**Template**:
A **visual layout** only — how a résumé is rendered (Classic, Modern, Minimal, Executive, Compact, Timeline). It controls columns, colors, and typography, never content.
_Avoid_: using "template" to mean the starting content — that's a **Starter**.

**Starter**:
A named **content preset** chosen when creating a résumé — a set of **Sections** with age-appropriate example text (Student, Internship, IT/Tech, Entry-Level, Professional). Determines initial content, not visual layout.

**AI Assist**:
The in-editor helper that acts on the active **Section** — rewrites, fixes grammar, or suggests bullets — via a server-side proxy to Groq. Operates on one Section's HTML at a time.

**Import** _(shipped)_:
Turning an uploaded résumé PDF into a new **Résumé**. The PDF's text is extracted **on the device** with pdf.js (the file never leaves it), sent once to the AI proxy's `import` task, and returned as structured **Sections**. Fills content only — the visual **Template** stays a separate, defaulted choice (Classic). The **Editor** is the review surface; there is no separate confirmation screen. Only text-based PDFs are supported (no OCR of scans). Implemented across `src/lib/pdfImport.js` (guards), `src/lib/pdfExtract.js` (lazy pdf.js), `src/lib/importSections.js` (AI-JSON → Sections), `src/lib/importResume.js` (orchestrator), and `src/components/ImportModal.jsx` (consent gate + UI).
