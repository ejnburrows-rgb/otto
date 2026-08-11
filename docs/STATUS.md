# STATUS — OTTO Plumbing CRM

Last updated: 2026-08-11.

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
- QuickBooks is a manual handoff only: copy/export details and open QuickBooks separately, with no OAuth or synchronization.

## Current owner / office UI contract

The required UI is a wallpaper-first operational workspace, not a generic SaaS dashboard.

- **Three primary windows open together:** Today, Field Workers, Inbox.
- Each primary window supports **minimize, restore, maximize inside the workspace, and full screen**.
- **Desktop:** primary launch/minimized state uses the left-side rail.
- **Phone:** the same primary actions use a compact bottom dock so working content receives the full phone width.
- **No generic drag/reorder.** The previous drag implementation interfered with ordinary scrolling.
- **Julio:** green interface accents + Julio wallpaper.
- **Saray:** pink interface accents + Saray wallpaper.
- **Otto:** blue OTTO identity; no wallpaper is invented.
- **Plans & AutoCAD:** first-class launcher using the existing PDF/DWG/DXF/DWF/DGN job-document pipeline.
- **Crew Hours:** whole-team today/week totals and currently clocked-in count derived from real job check-in/check-out records.
- Worker detail remains limited to current job, next job, today/week hours, and time-off status.
- Random heatmaps, fake KPI formulas, mock performance charts, vanity location counts, and login-history presentation are not approved worker UI.
- Owner/office Settings remains restrained: appearance, team access, owner security, data safety, and sign out.

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

## Verified engineering evidence

- The merged three-window workspace has previously completed its repository regression and QA chain on Vercel with zero failures.
- The merged unified file-intake production build completed its current regression/QA chain successfully on Vercel.
- PR #126 preview builds have run the full current source/unit suite, including dedicated UI-polish checks, and `qa-check` after the deployment layers were applied.
- Anonymous server requests return HTTP 401 before business data is read. Provider-token and role enforcement pass the repository regression suite.
- GitHub Actions may still fail before assigning a runner because of the account billing condition; that is an external verification blocker, not a passing or failing product test.

Do not hardcode old test totals as permanent truth; report the actual output of the current run.

## Broken / risky

- **Production proof must be checked after every release.** The public alias must show secure email-link sign-in and anonymous API requests must be rejected.
- **Administrator activation is incomplete.** Otto has a confirmed email in the business profile; Julio and Sarays still need confirmed email addresses. Supabase Auth currently has zero users until an authorized person completes the first secure email-link sign-in.
- **Cross-device proof is incomplete.** The server authorization tests pass, but the owner/field multi-device workflow cannot be completed until real accounts sign in.
- **Provider delivery is not proven.** Customer email/text and server AI require configured provider credentials and a real delivery test.
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
