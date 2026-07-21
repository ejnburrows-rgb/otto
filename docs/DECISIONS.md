# DECISIONS — OTTO Plumbing CRM

A dated log of technical choices and why they were made. Plain language. Add a
new line here whenever a real decision is made — see the DOCUMENTATION DUTY
section of [../AGENTS.md](../AGENTS.md).

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
