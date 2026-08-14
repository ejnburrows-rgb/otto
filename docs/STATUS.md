# STATUS — OTTO Plumbing CRM

Last updated: 2026-08-14.

This file is the current factual snapshot. Historical incident detail remains in Git history and issue/PR discussions; stale status narratives must not be used to restore superseded behavior.

**Production CRM:** `https://otto-kohl.vercel.app`

## Production now

- Current `main` contains the verified Supabase-provider build; release proof must check the public alias rather than relying on source state alone.
- Core offline-first CRM records and workflows remain present: customers, jobs, calls, notes, estimates, invoices, payments, checks, follow-ups, payroll intake, documents, reports, backups, Inbox, field check-in/out, work-only location records, and Ask OTTO.
- English/Spanish and light/dark modes are part of the app.
- The supplied OTTO Plumbing wordmark is `logo.jpg` and is the approved CRM logo.
- Julio and Saray have committed wallpaper assets.
- Failed job-photo uploads remain in a persistent retry flow instead of being silently abandoned.
- Current source uses Supabase email-link identity, persistent sessions, server-controlled OTTO roles, and record/job-level restrictions for field employees.
- Current source treats employee location as optional: approve or deny, continue either way, and collect work location only after approval.
- Inbox is one provider-neutral SendGrid-backed email register. Outbound estimates/invoices use PDF attachments; inbound messages, attachments and replies share the same customer/job thread.
- Anonymous boot no longer sends collection writes. Device-local PIN sign-in and Gmail polling have been removed; Supabase email-link identity is the only sign-in path.
- Default workflows/SOPs use stable IDs; production duplicates and the false restore alert have been removed. Backups now attempt private cloud storage before claiming `local+cloud`.
- All 43 current public document-store tables have an explicit direct-client deny policy, and the private upload bucket enforces a 25 MB limit plus an allowlist.
- EJN, Julio, Otto and Sarays are protected Owner profiles. Owner is the complete CRM role across users, customers, jobs, schedules, financial records, communications, documents, photos, plans, settings, backups and audit history. Uploaded-document deletion removes both the CRM record and its stored file.
- QuickBooks is a manual handoff only: copy/export details and open QuickBooks separately, with no OAuth or synchronization.

## Current owner / office UI contract

2026-08-14 — the director replaced the wallpaper-and-floating-windows presentation with a minimal application shell. The change is presentation only; no business logic, data model, permission or backend was altered, and the previous workspace runtime (`otto-home.js` / `otto-home.css`) is retained rather than deleted.

- **Desktop:** a dark left sidebar with five primary destinations — Today, Schedule, Jobs, Customers, Money — plus one Search / Ask OTTO command entry (⌘K) and a **More** menu holding every secondary feature.
- **Phone:** a bottom bar with Today, Schedule, Jobs, Customers, More. Content uses the full phone width.
- **Home is Today:** a three-number summary, today's jobs as the dominant section, Needs attention, and Recent activity. Every number comes from `db`; no records are invented and each section has a real empty state.
- **Superseded and removed from the shell:** wallpaper behind operational content, floating windows, and the minimize / maximize / full-screen window controls.
- Fixed palette (`#F7F7F8` page, `#FFFFFF` surface, `#111214` sidebar, `#2563EB` accent), one typeface (Geist, falling back to Inter), thin borders, no gradients or glass. Owner/office screens are light-only while the shell is active, so the theme control in Settings has no visible effect for those roles.
- **Julio, Saray and Otto** keep their identity data; the per-person accent and wallpaper treatment does not apply inside the shell, which uses one neutral palette.
- **No generic drag/reorder.** The previous drag implementation interfered with ordinary scrolling.

### Verified 2026-08-14

Full test suite green (`npm test`, exit 0; includes 48 new owner-shell checks) and `node scripts/qa-check.mjs` reports `pass: true`. Opened in Chromium at 1440×900 and 390×844 signed in as an owner: sidebar on desktop, bottom bar on phone, Geist rendering, `#F7F7F8` page and `#2563EB` accent measured in the browser, zero horizontal overflow on Today, Schedule, Money, Jobs, Customers, Inbox, Team and Settings, no broken images, and no JavaScript errors from this change. Screenshots in `outputs/shell/`. Cloud sign-in could not complete in the verification sandbox (no Supabase project configured), so the owner session was started locally against the same seeded data.
- **Plans & AutoCAD:** PDF and DXF are analyzable. DWG/DWF/DGN remain stored with the job and explicitly require a PDF or DXF export for reliable takeoff.
- **Crew Hours:** whole-team today/week totals and currently clocked-in count derived from real job check-in/check-out records.
- Worker detail remains limited to current job, next job, today/week hours, and time-off status.
- Random heatmaps, fake KPI formulas, mock performance charts, vanity location counts, and login-history presentation are not approved worker UI.
- Owner/office Settings remains restrained: appearance, team access, owner security, data safety, and sign out.

## Owner/office navigation repair — 2026-08-13

The owner reported being stuck on a screen with no back control and no menu, and
unable to open screens his role allows. Three confirmed defects, now fixed:

- **One fragile exit.** Every secondary view rewrites `#main`, which removes the
  workspace rail and the primary tabs, while the legacy bottom navigation is
  hidden for owner/office. The only way out was the `#otto-back-home` button in
  the top bar, and that button is skipped when no `.topbar` is present. A
  persistent Back / Home / Menu dock now renders on `document.body`, outside
  `#main`, so no view render can remove it. It does not appear on Home.
- **No device back.** The router changed screens by reassigning `route` alone and
  never touched the History API. With `manifest.json` set to `"display":
  "standalone"` the installed app has no browser chrome, so the phone back
  gesture closed OTTO. Route changes now record history entries and `popstate`
  restores the matching screen; a depth marker keeps Back from ever exiting.
- **Authorized screens with no entry point.** Workflows, Knowledge, Map, Cheques,
  Crew Hours (`kpis`), Backups and Audit are granted by `ROLE_VIEWS` but were
  only reachable through the legacy "More" sheet inside the hidden bottom
  navigation. They are now listed in Tools, each still `can()`-gated. Worker
  pages had the same problem in reverse: `viewWorkerProfile` existed but every
  crew row opened the modal summary, so the full Crew Hours screen now opens the
  worker's own page.

This narrows the earlier "Tools stays restrained" position: a screen a role
grants must be reachable. The regression test that asserted those views stayed
out of Tools was inverted to assert they are reachable. Home is unchanged —
three windows, desktop rail, phone dock, minimize/restore/maximize/full screen.

Verified: full suite 618 passed / 0 failed; `qa-check` pass. Exercised in
Chromium at 1440px and 390px as owner and as a field worker — dock present on
secondary screens only, 48px targets, no overlap with the add button, no
horizontal overflow, browser back returns instead of exiting, field users keep
their bottom navigation and never see the dock. Julio's green accents with the
mountain wallpaper and Saray's pink accents with the city-skyline wallpaper were
re-checked in the browser and are unchanged.

## Unified file intake — merged

PR #125 replaced the competing spreadsheet/OCR/CAD entry patterns with one current model:

- Excel/XLS/CSV reads structured cells directly and ends in an editable employee review table.
- Spreadsheet employee writes are forced to Field Worker; PINs are never imported.
- Imported workers are not given fabricated `check_in` or `check_out` events.
- Images and scanned PDFs use browser-side Tesseract OCR with English + Spanish loaded together.
- OCR output remains visible for review and can deliberately feed the same employee-review flow.
- DWG/DXF/DWF/DGN files require a job and reuse existing document storage plus drawing analysis.
- PDF asks one explicit choice between document OCR and plan/drawing instead of guessing.
- Old visible provider-key OCR/competing upload entry points were retired or redirected into the unified intake.
- Legitimate spreadsheet-imported employees survive reload instead of being removed by the old seed-ID cleanup.

`docs/UNIFIED-FILE-INTAKE.md` is authoritative for this area.

## UI premium refinement — merged

The focused refinement is merged on current `main`. It does **not** redesign the workspace or change CRM business logic.

Implemented on the branch:

- quieter shadows/glass/chrome and less decorative motion;
- subtle Today priority without creating another visual language;
- consistent secondary-screen headings, spacing, cards, lists, forms, buttons, focus states, tabs and empty/error/confirmation surfaces;
- larger practical touch targets;
- wrapped filters/tabs instead of hidden horizontal choices;
- phone bottom dock and full-width working stage instead of squeezing windows beside a desktop rail;
- thumb-friendly mobile action rows;
- semantic dialogs, keyboard focus trapping, Escape behavior, accessible toast announcements, keyboard/click logo-to-Home, and window-state `aria-pressed`;
- offline caching and dedicated regression coverage for the refinement layer.

The Vercel build path was corrected so final QA runs **after** all deployment layers are materialized; this prevents a test from passing while the deployed page accidentally omits the polish assets.

The current authenticated preview renders the premium sign-in screen in English and Spanish with no broken image or horizontal overflow. Full signed-in multi-account proof still requires real administrator accounts.

## Ask OTTO command assistant — release candidate

PR #139 adds one restrained wrench-based Ask OTTO surface for the four protected administrator profiles: EJN, Otto, Julio and Sarays. It preserves the existing three-window workspace and does not alter Julio or Sarays wallpaper assets.

- Search is intentionally limited to paystubs, contracts, emails, notes, payroll, schedules and employee records.
- Results are shown before opening; current-screen context is carried into the search so follow-up language such as “his last paystub” can resolve against the active record.
- Local CRM state provides offline search, preview and deterministic operations. Claude remains optional for drafting/reasoning when online.
- Supported creation/change intents include notes, email drafts, contracts, paystubs, payroll summaries, schedule changes and restricted employee-record updates.
- Record changes are proposed before application. Paystub values are sourced from recorded payroll data rather than invented by AI.
- The assistant JS/CSS are wired into the existing build and service-worker shell cache.
- The exact PR candidate completed a READY Vercel preview with the full repository build chain, dedicated Ask OTTO tests and `qa-check` reporting `pass: true` before merge. Production proof still requires checking the merged `main` deployment and public alias.

## Verified engineering evidence

- The `feat/employee-policy-ack` branch adds a versioned first-access Code of
  Conduct gate for field employees. The phone layout uses the approved OTTO
  logo, requires the employee to reach the end, capture a finger signature,
  check the confirmation, and tap Acknowledge. It stores the signature,
  timestamp, policy version, acknowledgment status, and employee-profile link
  before releasing the screen. The dedicated browser exercise passed 16/16 at
  390x844 and 1280x900 with no JavaScript errors or horizontal overflow. This
  branch has not been deployed; cross-device production proof still requires
  the real authenticated multi-account workflow.
- The merged three-window workspace has previously completed its repository regression and QA chain on Vercel with zero failures.
- The merged unified file-intake production build completed its current regression/QA chain successfully on Vercel.
- PR #126 preview builds have run the full current source/unit suite, including dedicated UI-polish checks, and `qa-check` after the deployment layers were applied.
- Anonymous server requests return HTTP 401 before business data is read. Provider-token and role enforcement pass the repository regression suite.
- GitHub Actions may still fail before assigning a runner because of the account billing condition; that is an external verification blocker, not a passing or failing product test.

Do not hardcode old test totals as permanent truth; report the actual output of the current run.

## Broken / risky

- **Production proof must be checked after every release.** The public alias must show secure email-link sign-in and anonymous API requests must be rejected.
- **Administrator activation is partial.** `ejnrcgplm@proton.me` is an active protected Owner. Julio and Sarays still need confirmed email addresses before their cloud identities can be invited.
- **Cross-device proof is incomplete.** The server authorization tests pass, but the owner/field multi-device workflow cannot be completed until real accounts sign in.
- **Provider delivery is blocked on business setup.** The owner is supplying the company domain. SendGrid SPF/DKIM, a verified `SENDGRID_FROM`, Inbound Parse, `INBOUND_WEBHOOK_TOKEN`, and confirmation of `NVIDIA_API_KEY` are still required before real email and AI delivery can be proven.
- Historical branches and documentation remain in Git history. `AGENTS.md` and `docs/REPO-CONTROL.md` are authoritative; do not resurrect superseded UI/auth/upload branches wholesale.

## Remaining release proof

Before describing OTTO as fully production-ready:

1. Verify the exact PR head has a READY Vercel preview and stamped version marker.
2. Confirm the deployed page actually loads the UI-polish CSS/JS and service worker caches them.
3. Exercise the real preview at desktop and phone widths for Julio, Saray, and Otto.
4. On desktop, verify the left rail and all three windows through minimize → restore → maximize → restore → full screen → restore.
5. On phone, verify the bottom dock, full-width working stage, touch targets, scrolling and window-state controls.
6. Exercise representative secondary screens, forms, wrapped tabs, empty states, dialogs, confirmations, EN/ES and light/dark.
7. Confirm no JavaScript errors, broken images, hidden controls, unintended horizontal overflow, or regressions to unified intake.
8. Promote the exact verified build to production and repeat the anonymous/authenticated checks on the public alias.

Do not report these gates as complete without direct evidence.
