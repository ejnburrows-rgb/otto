# DECISIONS — OTTO / NBO Hybrid CRM

This file records only decisions that still govern the product. Superseded implementation detail remains in Git history.

## 2026-09-17 — NBO hybrid archetype and local-first operating mode

- **OTTO becomes the first reusable NBO CRM archetype.** Preserve OTTO's complete business operating capability while applying a calmer, context-first interaction model informed by Tucker's strongest UI qualities.
- **Simple does not mean limited.** Customers, jobs, scheduling, estimates/invoices/payments, HR, payroll, employees, files, communications, reports, audit, backups, field workflows, plans, and AI-assisted work remain part of the product.
- **Context is the primary simplification mechanism.** Customer, job, and employee records should gather related information/actions so users do not have to think in disconnected modules.
- **Primary navigation stays small.** Owner/office keeps Today, Schedule, Jobs, Customers, Money. Secondary capabilities stay under More. Desktop uses the left rail; phone uses bottom navigation.
- **The active CRM is local-first for this release.** IndexedDB is the working database; existing local recovery/session mirrors may remain. Core startup, profile selection, CRUD, HR/payroll, scheduling, money, field work, and local file lookup do not depend on Supabase.
- **Previous Supabase integration is dormant, not destroyed.** Historical server modules/migrations and the remote project may remain as rollback/reference material, but they are not the active product path. Re-activating cloud auth/sync requires a new explicit owner decision.
- **The final materializer owns active runtime truth.** `scripts/apply-nbo-hybrid-local-patch.mjs` runs after historical OTTO materializers so legacy cloud assumptions cannot silently become active again.
- **Protected local profiles stay stable.** Otto (`owner-1`) and Julio (`owner-2`) remain Owners; Sarays (`ops-1`) remains Office Manager; EJN (`it-admin-ejn`) is the NBO Administrator using the existing owner-level role. No passwords, PINs, or invented emails are hardcoded.
- **Existing field employees are preserved.** The change does not invent or replace employee records.
- **Local profile selection is intentionally not presented as internet-grade authentication.** It is the operating model for this local-first phase.
- **Optional providers remain optional.** AI/email integrations may exist independently, but provider failure must not break core local CRM work.

## 2026-09-17 — durable UI/UX contract

- `DESIGN.md` is the durable visual intent for the NBO archetype.
- `UX-CONTRACT.md` is the durable observable behavior contract.
- The visual direction is a calm service-business operations desk: strong hierarchy, generous breathing room, restrained surfaces, clear rows/forms, visible focus, practical touch targets, and limited purposeful motion.
- Do not restore wallpaper-first owner workspaces, floating-window metaphors, neon/glass-heavy presentation, fake KPI walls, or decorative complexity.
- The memorable interaction is the contextual workspace, not a decorative dashboard.

## Active file/intake decisions

- **One Upload / Import front door.** Do not restore separate competing spreadsheet/OCR/CAD upload experiences.
- **Spreadsheets are parsed directly.** `.xlsx`, `.xls`, and `.csv` use structured cells rather than OCR.
- **Photos/scans use bilingual browser OCR.** Extracted text is reviewable before save/import.
- **PDF asks document vs. plan.** Do not guess silently.
- **Plans remain job-linked.** PDF, DWG, DXF, DWF, and DGN reuse the existing drawing/document pipeline.
- **Employee imports are review-first and least-privilege.** Imports create Field Worker records only, never credentials, and never fabricated attendance.

## Active worker/field decisions

- Worker information stays operational: current job, next job, real today/week hours, and time-off status.
- Crew Hours derives from actual job check-in/check-out records.
- Random heatmaps, login-history presentation, vanity location counts, fake performance charts, and placeholder-hour formulas are excluded.
- Job photos/files save locally first. Local file access must continue working without network access.
- Work-location behavior remains limited to approved work context/consent rules already in the field workflow.

## Money and accounting

- OTTO owns operational estimates, invoices, payments, checks, payroll intake, and exports already implemented.
- QuickBooks remains a manual handoff. Do not add Intuit OAuth/background synchronization or duplicate accounting logic without a new explicit requirement.

## AI

- Search deterministic local records first.
- External AI is optional and provider keys remain server-side.
- AI may interpret, summarize, extract, or draft; consequential proposed record changes require preview/confirmation.
- Provider unavailability must degrade to local search/manual work rather than making the CRM unusable.

## Data and safety

- Never commit secrets, API keys, passwords, PINs, or fallback credentials.
- Never delete remote/live data or the dormant Supabase project without explicit approval for that exact action.
- Preserve recoverable deletion/backups and existing business records unless explicitly changed.
- Do not claim provider delivery, browser behavior, deployment success, or production state without direct evidence.
