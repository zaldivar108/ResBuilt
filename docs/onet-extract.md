# O*NET data — how to replace the seed with the full dataset

> **Status (live):** Option B is **implemented**. The app now calls the O*NET
> **v2 API** (`https://api-v2.onetcenter.org`) through the `api/onet.js` Edge
> proxy when `ONET_API_KEY` is set, and falls back to the bundled seed otherwise.
> Search → `/mnm/search` (`career[]`); details → `/mnm/careers/{code}/` (one call:
> `on_the_job` → tasks, `also_called` → keywords, `title`). Auth is the
> `X-API-Key` header, GET only. Normalizers: `src/lib/onetNormalize.js`;
> client helpers: `searchOccupationsRemote` / `getOccupationRemote` in
> `src/lib/onet.js`. Section below documents the alternatives.

The résumé builder grounds its suggestions in **O*NET** occupational data
(tasks + skills per job) so the AI doesn't invent duties. Right now
[`src/config/onetData.js`](../src/config/onetData.js) holds a **hand-curated seed**
of ~10 common teen / young-adult first jobs. This doc explains how to swap it for
the full dataset once available.

The only stable contract is the repository in
[`src/lib/onet.js`](../src/lib/onet.js): `searchOccupations(query)` →
`[{ code, title }]` and `getOccupation(code)` → `{ code, title, keywords, tasks, skills }`.
As long as a new source produces records of that shape, **no UI or test changes
are needed.**

## Attribution (required)

O*NET is sponsored by the U.S. Department of Labor / ETA and licensed **CC BY 4.0**.
Any build using O*NET data must credit and link to O*NET. The seed file carries
this notice; keep it, and surface an attribution line in the UI where suggestions
appear.

## Option A — Full bulk database (offline, recommended)

1. Download the **O*NET Database** (text/CSV or MySQL) from
   <https://www.onetcenter.org/database.html>.
2. Extract the relevant files:
   - `Occupation Data.txt` → `code` (O*NET-SOC), `title`
   - `Task Statements.txt` → tasks per `code` (filter `Task Type = Core`)
   - `Skills.txt` → skills per `code` (join to `Content Model Reference` for names;
     keep the top N by `Importance`/`Data Value`)
   - `Alternate Titles.txt` → good source for `keywords`
3. Write a build script (`scripts/build-onet.mjs`, Node) that joins these into the
   record shape above and emits either:
   - a single `src/config/onetData.js` (small subset), or
   - per-occupation JSON in `public/onet/<code>.json` + a bundled `index.json`
     (better at full scale — lazy-fetch per occupation, keep the main bundle lean;
     change `onet.js` to `fetch()` per code and make `getOccupation` async).
4. Trim to entry-level / teen-relevant occupations to keep size reasonable, or ship
   all and lazy-load.

## Option B — O*NET Web Services API (live)

1. Register at <https://services.onetcenter.org/developer/signup> (org approval
   required — not instant).
2. Store the credentials **server-side** (Vercel env var, like `GROQ_API_KEY`) and
   proxy through a new `api/onet.js` Edge function — never expose the key client-side.
3. Endpoints: keyword search → `GET /ws/online/search?keyword=`; details →
   `GET /ws/online/occupations/{code}/details/tasks` and `.../skills`.
4. Reimplement `onet.js` to call the proxy (async). Cache responses; the API is
   rate-limited "best-effort". Note: this reveals the user's job search to O*NET —
   weigh against the app's privacy-first stance.
