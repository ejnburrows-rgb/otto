# OTTO Plumbing CRM

OTTO is the internal bilingual CRM for **OTTO Plumbing Inc.** It is a mobile-first, offline-capable Progressive Web App for customers, jobs, field work, documents, estimates/invoices/payments, payroll intake, Inbox, reporting, job photos, work-only check-in/location, drawing takeoff, and Ask OTTO.

**Production CRM:** `https://otto-kohl.vercel.app`

The public plumbing website is maintained separately in `ejnburrows-rgb/otto-plumbing-site`.

## Start here

For current instructions and product truth, read in this order:

1. `AGENTS.md`
2. `docs/REPO-CONTROL.md`
3. `docs/STATUS.md`
4. `docs/DECISIONS.md`
5. `docs/UNIFIED-FILE-INTAKE.md` when working on uploads, imports, OCR, or Plans & AutoCAD
6. `docs/NO-QUICKBOOKS.md`

Old task queues, branch handoffs, historical audits, and chat summaries are not active instructions unless `docs/REPO-CONTROL.md` explicitly activates them.

## Current owner / office workspace

The approved owner/office direction is a wallpaper-first workspace, not a generic dashboard:

- **Three primary windows are open together:** Today, Field Workers, and Inbox.
- Every primary window can **minimize, restore, maximize inside the workspace, and use full screen**.
- **Desktop:** minimized windows and primary launchers use the left-side rail.
- **Phone:** the same primary actions use a compact bottom dock so working content receives the full phone width instead of being squeezed beside a desktop rail.
- Generic drag/reorder behavior is intentionally excluded because the earlier drag implementation interfered with normal scrolling.
- **Julio** uses green interface accents and his committed wallpaper.
- **Saray** uses pink interface accents and her committed wallpaper.
- **Otto** keeps the blue OTTO identity; no wallpaper is invented for him.
- The supplied `logo.jpg` OTTO Plumbing wordmark remains the CRM logo and returns the user Home.
- **Plans & AutoCAD** remains a first-class launcher and accepts PDF, DWG, DXF, DWF, and DGN through the existing job-document/drawing workflow.
- **Crew Hours** shows actual recorded hours for the whole field crew from job check-in/check-out records. Worker detail is intentionally limited to current job, next job, today/week hours, and time-off status.
- Random worker heatmaps, fake KPI hours, vanity location counts, login-history presentation, and mock performance charts are not part of the approved worker UI.
- Owner/office Settings is deliberately restrained: appearance, team access, owner security, data safety, and sign out. Provider keys and unfinished setup stubs are not normal owner-facing controls.

The UI direction is now **refinement, not redesign**: clearer hierarchy, consistent secondary screens/forms/tabs, restrained shadows and motion, practical touch targets, intentional empty/error/confirmation states, and keyboard-accessible dialogs/window controls.

These are product requirements. Do not simplify the workspace back to one active panel or change Julio/Saray accent identities without a new explicit owner decision.

## Unified file intake

Uploads, imports, OCR, and Plans & AutoCAD follow one user model: **Give OTTO the file → review what OTTO read → confirm → save.**

- Excel/CSV is read directly as structured employee data; spreadsheets are not OCR'd.
- Photos/scans use bilingual browser OCR (English + Spanish).
- DWG/DXF/DWF/DGN plans require a job and reuse the existing drawing pipeline.
- PDF asks one simple choice because it can be either a scanned document or a plan.
- Spreadsheet employee imports are Field Worker only, never import PINs, and never fabricate attendance.

`docs/UNIFIED-FILE-INTAKE.md` is the task-specific source of truth. Do not restore separate provider-key OCR or competing scan/CAD upload experiences.

## Current state

- The local/offline CRM and built-in demo are present.
- English/Spanish, light/dark, personal identity treatment, and offline behavior must be preserved.
- The Supabase project and core production tables already exist. This is **not** waiting on initial database creation or merely two Vercel variables.
- Sensitive server routes remain intentionally fail-closed until the fresh server-authorization work in issue **#70** is implemented and proven from current `main`.
- The older Supabase Auth attempt, PR **#103**, was reviewed and closed unmerged. Do not resurrect or merge that branch wholesale.
- Duplicate/demo live records are tracked separately in issue **#111**; no live deletion is authorized by this README.
- Failed photo uploads must remain queued and visibly pending instead of being silently abandoned.

## Authentication and shared sync

A local PIN is a convenient device unlock; it is not sufficient server authorization.

The replacement server authorization must be built fresh from current `main` under issue #70 using provider-backed identity, explicit role allowlists, record/job-level authorization, fail-closed defaults, and deployed multi-account proof.

Until that work is complete, do not describe shared server data, cross-device photo access, notifications, or server AI as safely production-enabled simply because backend code or environment variables exist.

## QuickBooks

**QuickBooks/Intuit integration is deliberately out of scope.** `docs/NO-QUICKBOOKS.md` is authoritative.

Keep OTTO's native invoices/payments, generic CSV export, payroll import, jobs, customers, documents, reports, Inbox, and Ask OTTO. Do not restore `/api/quickbooks`, Intuit OAuth, QuickBooks credentials, QuickBooks-specific UI, or QuickBooks-specific tests without a new explicit requirement.

## Main capabilities

- Customers, jobs, calls, notes, follow-ups, and workflows
- Job photos and documents
- Unified Upload / Import intake for spreadsheets, scans, PDFs, and CAD files
- Plans & AutoCAD / drawing upload and takeoff workflow
- Estimates, invoices, payments, and checks inside OTTO
- Payroll spreadsheet/CSV intake
- Whole-crew recorded hours plus simplified worker detail
- Inbox/email register
- Work-only field check-in/out and location records
- Reports, audit/history, backups, JSON/CSV export
- Project/job context and Ask OTTO
- English and Spanish
- Light and dark modes
- Offline-first PWA behavior

Some provider/server-backed capabilities remain blocked until issue #70 is complete. Code presence alone is not proof that a feature is live.

## Development and verification

Before changing anything, start from current `main` on a focused branch and follow the repository control files above.

Run the current applicable commands from `package.json`. The normal verification baseline includes:

```bash
npm test
node scripts/qa-check.mjs
npm run qa:visual
```

For UI or behavior changes, browser verification is mandatory. Check phone and desktop widths, English/Spanish, light/dark where applicable, JavaScript errors, broken images, navigation, keyboard/touch behavior, and unintended overflow. For the owner/office home specifically, exercise all three windows through minimize, restore, maximize and full screen, verify desktop left rail and phone bottom dock, then verify Julio, Saray and Otto separately.

Do not put a permanent fixed test count in this README; report the actual result of the current run.

## Safety

- Never commit secrets, API keys, PINs, passwords, tokens, or fallback credentials.
- Never hand-build authentication or homemade JWT verification.
- Never make the server authorization boundary permissive as a shortcut.
- Never delete live data without explicit approval for the exact rows after backup and dependency review.
- Never reintroduce retired Firebase or QuickBooks configuration.
- Never claim production/deployment success without direct evidence.

For full rules and the active priority order, use `AGENTS.md` and `docs/REPO-CONTROL.md`.
