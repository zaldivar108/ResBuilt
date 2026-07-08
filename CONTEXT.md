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
The in-editor helper that acts on the active **Section**. Three modes in the dock: **Edit my text** (Improve / Fix grammar / Format / Suggest ideas), **Real job duties** (O*NET grounding), and **Match a job** (see *Job match*). *Improve*, *Format* (non-contact), and *Suggest ideas* go to the Groq proxy; *Fix grammar* — and *Format* on a contact Section — run fully on-device (nothing sent). Operates on one Section's HTML at a time.

**Job match** _(shipped)_:
The **Match a job** mode: the user supplies a target job, and AI Assist compares it against the active **Section** — reporting what the Section already covers, what's missing, and honest bullet suggestions, with an optional rewrite that only reorders existing content (never fabricates). The target job is normally a pasted job posting; it may also come from the **Interest Profiler** (which supplies the chosen career's real O*NET duties as the comparison text). UI: `src/components/ui/JobTailor.jsx`.

**Interest Profiler**:
The **"Find a job that fits"** quiz — O*NET's 30-question Mini-IP. Scores the user's interests (RIASEC) and returns matching **careers** (`{ code, title }`), on-device except three proxied O*NET calls (only anonymous answers are sent — no PII). Two entry points: from the dashboard it starts a **new Résumé** for a chosen career; inside **Job match** it supplies a chosen career as the target job to tailor the current Section toward. Result is cached in localStorage. UI: `src/components/ui/InterestProfiler.jsx`.

**O*NET grounding** _(shipped)_:
Real occupational data (tasks + skills per job, from O*NET / U.S. Dept. of Labor, CC BY 4.0) used so suggestions aren't blind LLM guesses. In the "Real job duties" tab: search a job → pick it → check real duties → **Add selected** (inserts verbatim, on-device, zero AI) or **✨ Make it mine** (sends checked duties to the Groq `polish` task to rewrite in a teen voice, still grounded). Source is a **swappable repository** (`src/lib/onet.js`); today reads a bundled seed (`src/config/onetData.js`, ~10 occupations), later the full DB or approved API — see `docs/onet-extract.md`. UI: `src/components/ui/OnetSuggest.jsx`.

**Import** _(shipped)_:
Turning an uploaded résumé file into a new **Résumé**. Supports **PDF, Word (.docx), .txt, and .md** (legacy binary .doc is rejected with guidance — no reliable in-browser extractor). Text is extracted **on the device** (pdf.js for PDF, mammoth for .docx, direct read for text; the file never leaves it), sent once to the AI proxy's `import` task, and returned as structured **Sections**. Fills content only — the visual **Template** stays a separate, defaulted choice (Classic). The **Editor** is the review surface; no separate confirmation screen. Scanned/image PDFs aren't supported (no OCR). Implemented across `src/lib/pdfImport.js` (guards: `fileKind`/`validateImportFile`), `src/lib/fileExtract.js` (format dispatch, lazy libs), `src/lib/importSections.js` (AI-JSON → Sections), `src/lib/importResume.js` (`importResumeFromFile` orchestrator), and `src/components/ImportModal.jsx` (consent gate + UI).
