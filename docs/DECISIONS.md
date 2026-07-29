# DECISIONS — OTTO Plumbing CRM

A dated log of technical choices and why they were made. Plain language. Add a
new line here whenever a real decision is made — see the DOCUMENTATION DUTY
section of [../AGENTS.md](../AGENTS.md).

- **2026-07-21** — Cloud sync updates by checking every 20 seconds rather than
  staying permanently connected for instant updates. Instant updates require each
  phone to hold an open connection straight to the database, which means the
  browser must carry a database key — the exact thing whose removal closed the
  Firebase breach. Twenty seconds is indistinguishable from instant when
  dispatching a plumber, and it survives basements and crawlspaces where a
  permanent connection would drop constantly. Worth revisiting once sign-in is
  enforced on a server rather than in the browser; until then "restrict access to
  whoever is signed in" does not mean much here.

- **2026-07-21** — Deleting a record hides it instead of destroying it. An
  accidental delete stays recoverable, invoice history survives for accounting,
  and a phone that was offline when a delete happened cannot bring the record
  back to life. Cost: the database keeps rows nobody can see any more.

- **2026-07-21** — Conflicts are settled per whole record by "most recently
  edited wins", not by merging individual fields. The crew almost always work on
  different records, so the clash is rare; field-level merging would add real
  complexity to handle something that seldom happens.

- **2026-07-21** — The cloud sync merge rules exist in two places on purpose:
  `scripts/sync-merge.mjs` (where they are tested) and inside `index.html` (where
  they run). The app is deliberately one file with no build step, so it cannot
  import anything. `scripts/test-inpage-merge.mjs` pulls the rules back out of
  `index.html` and runs the same tests against them, so the two copies cannot
  quietly drift apart.

- **2026-07-21** — Replaced the GitHub Pages deploy workflow with one that runs
  the tests. Pages was never switched on, so that workflow had failed on every
  push since it was written. A permanently red tick teaches everyone to ignore
  failures, which is worse than having no check at all. The live site is on
  Vercel and deploys itself.

- **2026-07-21** — Migrated backend from Firebase to Supabase; old Firebase DB
  pending shutdown. The Firebase database was publicly readable and the owner
  could not get into its console to lock it, so the project moved to Supabase,
  which the owner controls. All 44 stored collections were exported to local
  backups first, before anything was changed.

- **2026-07-21** — The browser no longer talks to the database directly. It calls
  a small server-side function (`api/data.js`) that holds the secret key in
  Vercel's settings, the same pattern already used for the Anthropic and NVIDIA
  keys. The alternative — letting the browser use Supabase's public key with
  "anonymous sign-in" turned on — was rejected because it would have repeated
  the Firebase mistake: a key in the page source that grants database access.
  Every table denies the public key outright instead.

- **2026-07-21** — Full sweep completed; execution plan created. Every claim was
  re-checked against `origin/main` and the live site rather than a local copy,
  after an earlier sweep was found to have run against out-of-date code and
  reported already-fixed problems. Remaining work was written up as numbered
  tasks in `docs/issues/`.

- **2026-07-21** — Kept the existing `README.md`, `SPEC.md` and `.gitignore` from
  `main` instead of overwriting them with an older session's versions. The
  versions on `main` had already been corrected against the shipped code
  (including the live URL, `otto-kohl.vercel.app`), so overwriting them would
  have reintroduced stale claims.

- **2026-07-20** — Adopted AGENTS.md documentation standard. One rules file
  (`AGENTS.md`) is now the single source of truth for any AI agent working in
  this repo; `CLAUDE.md` and `GEMINI.md` just point to it, so the rules never
  drift apart between different AI tools.

The decisions below were already made in the code before this log started;
they are recorded here from the codebase and git history so the reasoning
isn't lost.

- Single-file app, no build step. `index.html` holds the entire application —
  no compiling, bundling, or framework install needed. Anyone can open the
  file directly or drop it on any web host and it works. Trade-off: the file
  is large (about 300 KB) and everyone editing it touches the same file.

- IndexedDB (with a localStorage mirror) as the data store, instead of
  requiring a server. A plumbing crew works in the field with unreliable
  internet, so the app had to work fully offline; the data lives on the
  device first, with cloud sync as an optional add-on rather than a
  requirement.

- Progressive Web App (PWA) with a service worker, instead of a native
  iOS/Android app. Installs to a phone's home screen like a real app, works
  offline, and needs no app-store approval or per-device install process —
  much simpler to roll out to a 15-person field crew.

- Bilingual (English/Spanish) from day one, not added later. The crew
  includes Spanish-speaking field workers; every UI string exists in both
  languages so no one is left out of any screen.

- AI API keys (Anthropic, NVIDIA) live only in server-side Vercel functions
  (`api/claude.js`, `api/nvidia.js`), never in the browser. This keeps paid
  API keys from being visible to anyone who opens the browser's developer
  tools, while still giving every worker's device AI features with nothing
  to configure per-device.

- Firebase Firestore chosen for optional multi-device cloud sync, over
  running a full custom backend server — it's a managed, low-maintenance
  database that fits a small team's budget and needs no server to operate.
  (See `docs/STATUS.md` Known Issue #1 for the security follow-up this
  choice still needs.)

- Vercel chosen as the production host (serverless functions + static
  hosting in one place), with GitHub Pages kept as a secondary/static-only
  deploy target via `.github/workflows/deploy.yml`.

- "Miami Luxe" visual design system with glassmorphism (a frosted-glass
  translucent look) adopted for the interface (commit `7b0e9ff`), replacing
  earlier UI passes, to give the app a premium, branded feel matching a
  Miami-based business.

- The previous product — a Dream Cooling (HVAC) CRM — was kept as
  `legacy/dream-cooling-crm.html`, explicitly for rollback reference only,
  rather than deleted, when the business pivoted to OTTO Plumbing.

- 2026-07-29 — Demo Mode uses an `otto_demo` localStorage flag plus a full IDB
  wipe-and-reseed on entry. The seeded owner's `gpsAcknowledged` is set to
  `true` in `blankDB()` so fleet-GPS onboarding never blocks the demo owner
  (GPS is a field-worker-only concern). PIN `1234` for all 19 users is set at
  runtime via `setUserPin()` (salt+hash), not stored in source. The "Exit demo"
  button calls `indexedDB.deleteDatabase('otto-crm')` to fully purge the demo
  database.

- 2026-07-29 — Seed records in `blankDB()` (customers, jobs, calls) use fixed
  deterministic IDs instead of `uid()`. This prevents duplicate seed rows
  appearing in the cloud when two devices each call `blankDB()` on first
  launch: Supabase's `merge-duplicates` upsert now collapses them into one.
  User-created records and other generated IDs still use `uid()`.

- 2026-07-29 — Cloud polling 404s on localhost is left as benign noise: fetch
  `/api/data` 404 naturally resolves to false without crashing the app, but
  pollutes the DevTools console with one network error per 20-second cycle.
  This is acceptable for local development; production Vercel serves the real
  endpoint.
