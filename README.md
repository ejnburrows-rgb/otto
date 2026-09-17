# OTTO Plumbing CRM — NBO Hybrid

OTTO is the internal bilingual business operating system for **OTTO Plumbing Inc.** It is also the first reusable NBO CRM archetype: full operational depth with a restrained, context-first interface.

The public plumbing website is maintained separately in `ejnburrows-rgb/otto-plumbing-site`.

## Start here

Read current product truth in this order:

1. `AGENTS.md`
2. `docs/REPO-CONTROL.md`
3. `docs/STATUS.md`
4. `docs/DECISIONS.md`
5. `DESIGN.md`
6. `UX-CONTRACT.md`
7. `docs/UNIFIED-FILE-INTAKE.md` for uploads/OCR/plans

Historical specs, old handoffs, and retired cloud setup are reference material only unless `docs/REPO-CONTROL.md` reactivates them.

## Product model

OTTO contains the complete business database and operating workflow. Simplicity comes from **context and progressive disclosure**, not from removing capability.

Owner/office primary navigation is intentionally limited to:

- Today
- Schedule
- Jobs
- Customers
- Money

Everything else remains available under **More**. Desktop uses the dark left rail. Phone uses the bottom navigation so working content keeps the full screen width.

Customers, jobs, and employees are contextual workspaces: related money, files, communications, history, HR, schedule, and actions stay connected to the record the user is already working on.

## Active local-first architecture

The current NBO-hybrid release is local-first:

- **IndexedDB** is the active working database.
- `localStorage` remains a recovery/session mirror where the existing app uses it.
- Core startup, profile selection, CRUD, local files, HR, payroll, scheduling, money, and field workflows do **not** require Supabase.
- The previous Supabase integration remains dormant in repository history/server modules as rollback reference; it is not the active CRM data/auth path.
- The remote Supabase project is intentionally not deleted by this release.

The four protected local administrator profiles are:

- **Otto** — `owner-1` — Owner
- **Julio** — `owner-2` — Owner
- **Sarays** — `ops-1` — Office Manager
- **EJN** — `it-admin-ejn` — NBO Administrator / owner-level role

No password, PIN, or invented email is hardcoded for these profiles. Existing field-worker records remain in the local Team database.

Local profile selection is an operational convenience for this phase; it is not presented as internet-grade multi-tenant authentication.

## Main capabilities

- Customers, contacts, jobs/work orders, calls, notes, follow-ups, and workflows
- Schedule/dispatch and field/mobile job flows
- Job photos, documents, checklists, and local file storage
- Unified Upload / Import for spreadsheets, scans, PDFs, and CAD files
- Plans & AutoCAD / drawing intake and takeoff workflow
- Estimates, invoices, payments, checks, and pricing
- Team/HR, payroll intake, crew hours, PTO, policies, and acknowledgments
- Inbox/email register and communications history
- Reports, audit/history, backups, JSON/CSV export
- Customer/job/employee context and Search / Ask OTTO
- English and Spanish
- Offline-first PWA behavior

Optional provider-backed features such as external AI or email delivery require their own configured company credentials. Their absence must not break core local CRM work.

## Unified file intake

Use one model: **Give OTTO the file → review what OTTO read → confirm → save.**

- Excel/CSV is parsed directly.
- Photos/scans use bilingual browser OCR.
- DWG/DXF/DWF/DGN and plan PDFs stay linked to a job and reuse the existing drawing pipeline.
- PDF asks document vs. plan because the format is ambiguous.
- Employee imports create Field Worker records only, never import credentials, and never fabricate attendance.

## UI contract

The UI is intentionally calm, not limited. Preserve:

- five primary owner/office destinations;
- More for secondary tools;
- practical phone/desktop layouts;
- real data instead of fake KPIs;
- consistent forms, lists, tables, dialogs, focus states, and empty/error states;
- restrained shadows/motion and no wallpaper-first workspace, neon dashboard treatment, excessive glass, or decorative complexity.

`DESIGN.md` and `UX-CONTRACT.md` are the durable NBO archetype contracts.

## QuickBooks

QuickBooks remains a manual handoff only: copy/export useful data and open the official QuickBooks site separately. Do not add Intuit OAuth or duplicate accounting logic unless explicitly approved later.

## Development and verification

Use the current commands in `package.json`. The normal baseline is:

```bash
npm test
node scripts/qa-check.mjs
npm run qa:visual
```

UI/behavior changes require phone and desktop verification, English/Spanish checks, JavaScript/runtime-error review, broken-image/overflow checks, and confirmation that core local work still functions without network access.

Never hardcode a permanent test count in this README; report the actual result produced by the current run.

## Safety

- Never commit secrets, API keys, PINs, passwords, tokens, or fallback credentials.
- Never invent business records or identity/contact details.
- Never delete remote/live data without explicit approval for the exact destructive action.
- Never claim a deployment or browser workflow passed without direct evidence.
- Dormant cloud code is not active product truth merely because it remains in history or server files.

For current priorities and non-regression rules, use `docs/REPO-CONTROL.md`.
