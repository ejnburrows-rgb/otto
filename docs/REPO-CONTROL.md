# OTTO Repository Control Center

This file is the current product/control truth for `ejnburrows-rgb/otto`. Historical handoffs, old audits, superseded specs, and dormant cloud code do not override it.

## Read order

1. `AGENTS.md`
2. this file
3. `docs/STATUS.md`
4. `docs/DECISIONS.md`
5. `DESIGN.md`
6. `UX-CONTRACT.md`
7. `docs/UNIFIED-FILE-INTAKE.md` when working on uploads/OCR/plans

## Current objective

Finish OTTO as the first reusable **NBO hybrid CRM archetype**: the full business operating capability already built in OTTO, with a calm, context-first interface influenced by Tucker's strongest visual/interaction qualities.

Do not confuse simple with limited. The CRM remains the business database for customers, work, money, HR, payroll, employees, communications, files, field operations, reporting, audit, backups, plans, and AI-assisted work.

## Active architecture

The active CRM path is local-first for this release.

- IndexedDB is the working business database.
- `localStorage` may remain as the existing recovery/session mirror.
- Core startup, profile selection, CRUD, HR/payroll, scheduling, money, field work, and local files must operate without Supabase or network access.
- `scripts/apply-nbo-hybrid-local-patch.mjs` is the final materializer and therefore the active authority after historical OTTO materializers run.
- Previous Supabase server modules/migrations may remain as dormant rollback/reference material, but they are not current product truth and must not be restored into the active boot/save flow without a new owner decision.
- The remote Supabase project is not deleted by this release.
- Optional external providers such as AI/email may remain separately configured and must fail without breaking core local work.

## Profiles

Preserve these protected local identities and IDs:

- `owner-1` — Otto — Owner
- `owner-2` — Julio — Owner
- `ops-1` — Sarays — Office Manager (`office` role)
- `it-admin-ejn` — EJN — NBO Administrator using the existing owner-level role

Do not invent passwords, PINs, emails, or other identity data. Existing active field-worker records stay in the local Team database and remain available to the field experience.

Local profile selection is a deliberate temporary operating model, not a claim of internet-grade authentication.

## UI contract

Owner/office users have exactly five primary destinations:

1. Today
2. Schedule
3. Jobs
4. Customers
5. Money

Everything else stays available under **More**. Desktop uses the left rail. Phone uses bottom navigation and full-width working content.

The interaction model is contextual:

- customer records bring together the customer's connected work, money, communications, files, notes, and history;
- job records bring together customer, schedule, crew, files/photos, checklist, estimate/invoice, time, communications, and AI context;
- employee records bring together profile/role, assignments, hours, payroll records, PTO, policy acknowledgments, documents, and messages.

Do not duplicate business logic to create context. Reuse canonical records/actions.

`DESIGN.md` owns visual intent. `UX-CONTRACT.md` owns observable product behavior.

## UI non-regression rules

- Do not restore the wallpaper-first/floating-window owner workspace as the default.
- Do not add primary destinations merely because a feature exists.
- Do not force desktop navigation into phone width.
- Do not reintroduce generic drag/reorder on operational cards/lists.
- Do not invent fake KPIs, worker heatmaps, vanity charts, attendance, or business data.
- Crew Hours comes from real check-in/check-out records.
- Plans & AutoCAD remains a first-class work capability and keeps job context.
- Keep one Upload / Import front door; do not recreate competing spreadsheet/OCR/CAD upload flows.
- Keep Settings restrained; provider internals are not normal owner-facing controls.
- Keep the supplied OTTO Plumbing wordmark as the CRM brand asset.
- Keep English/Spanish parity.
- Keep visible keyboard focus, practical touch targets, intentional empty/error/confirmation states, and reduced-motion support.
- Do not add neon, excessive glass, wallpaper clutter, heavy shadows, or decorative dashboard complexity to signal “premium.”

## Feature preservation

The NBO hybrid change must not remove working capability. Preserve, where already implemented:

- customers and jobs/work orders;
- schedule/dispatch and field workspace;
- estimates, invoices, payments, checks, and pricing;
- Team/HR, payroll intake, crew hours, PTO, policies, acknowledgments;
- photos/documents and local file handling;
- unified import/OCR and Plans & AutoCAD;
- Inbox, calls, follow-ups, workflows, alerts, knowledge;
- reports, audit/history, backups/export;
- Search / Ask OTTO and contextual record tools;
- bilingual and offline PWA behavior.

Provider-dependent delivery is never claimed merely because provider code exists.

## Data safety

- Never commit secrets, credentials, fallback passwords/PINs, or provider keys.
- Never delete remote/live records or the dormant Supabase project without explicit approval for that exact destructive action.
- Local file/photo operations must not silently discard user data.
- Recoverable deletion/backup behavior stays intact unless explicitly redesigned and approved.
- Payments/accounting behavior is not casually altered as part of UI work.

## Verification

A release is accepted only with direct evidence appropriate to the change:

- complete current source/test gate passes;
- `node scripts/qa-check.mjs` passes;
- NBO local-hybrid contract test passes;
- the deployed preview/build is READY;
- changed UI is checked at desktop and phone widths when a browser runner is available;
- English/Spanish, navigation, context, profile switching, runtime errors, broken images, and horizontal overflow are checked;
- core local work is verified without depending on Supabase/network access;
- `docs/STATUS.md` receives a factual dated release update.

GitHub Actions that never obtain a runner are an external CI limitation, not application evidence. Use an actually executing build/test environment for proof and state any browser-proof limitation explicitly.

## Git/release rule

`main` remains the production source of truth. Work on a focused branch/PR, review the actual diff, and merge only after the executing verification gate is clean. Never force-push shared history.

## Reporting

Final execution reports stay short and factual:

- what changed;
- what was verified and where;
- what remains genuinely unverified or dormant.
