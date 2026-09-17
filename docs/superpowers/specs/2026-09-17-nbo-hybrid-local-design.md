# NBO Hybrid Local CRM Design

## Goal
Turn OTTO into the first reusable NBO CRM archetype by combining OTTO's complete business operating feature set with Tucker's calmer, cleaner interaction model, while removing Supabase from the active CRM runtime for now.

## Product principle
The CRM remains the complete business database. Simplicity comes from context and progressive disclosure, not from deleting capability.

Users should see only what is relevant to the work in front of them. Customers, jobs, employees, money records, communications, files, HR, payroll, field operations, reports, audit history, backups, plans, and AI remain available.

## Navigation and interaction model
Owner and office users keep five primary destinations: Today, Schedule, Jobs, Customers, Money. Everything else is organized under More.

Records become the center of work:
- Customer context brings together jobs, estimates, invoices, payments, communications, notes, files, photos, and history.
- Job context brings together customer, schedule, crew, files, photos, checklists, estimate, invoice, communications, time, and AI context.
- Employee context brings together profile, HR, assignments, hours, payroll records, PTO, policies, documents, and messages.

Search / Ask OTTO remains the global command surface. It should search deterministic local business data first and use AI only when generation, interpretation, extraction, or summarization is useful.

## Visual direction
The product should feel like a calm service-business operations desk rather than a dashboard cockpit.

Use the existing neutral OTTO shell as the base and lift it with Tucker's strongest qualities: stronger typography, more breathing room, clearer grouping, quieter surfaces, polished focus/hover states, consistent record headers, and deliberate motion only where it clarifies transitions.

Avoid wallpaper-first presentation, neon effects, decorative glass, heavy shadows, fake KPI charts, excessive cards, and visual treatments that expose technical complexity.

The memorable signature is the context workspace: opening a customer, job, or employee should make the related business information feel like one coherent place rather than separate modules.

## Active data model
IndexedDB is the primary working database. localStorage remains a recovery/session mirror where the existing app needs it. Supabase is removed from the active CRM runtime for this release.

The remote Supabase project is not deleted. It remains dormant as rollback insurance. No active user flow should depend on Supabase authentication, Supabase REST APIs, Supabase storage, or Supabase environment variables.

Cloud-specific failure states must not appear in the normal local CRM experience.

## Profiles and access
Preserve the four established protected identities and IDs:
- `owner-1` — Otto — Owner
- `owner-2` — Julio — Owner
- `ops-1` — Sarays — Office Manager
- `it-admin-ejn` — EJN — NBO Administrator

These profiles are preconfigured in the local CRM. Do not invent email addresses, passwords, PINs, or secrets. Existing field-worker records remain intact.

For this local-first phase, profile selection replaces provider-backed cloud authentication. Role permissions remain enforced by the application's existing role/capability checks. This local profile gate is an operational convenience, not a claim of internet-grade multi-tenant security.

## Feature preservation
Do not remove working CRM capability. Preserve customers, jobs/work orders, schedule/dispatch, estimates, invoices, payments, checks, payroll, HR/team, employee hours, PTO, documents, photos, unified upload/import, Plans & AutoCAD, inbox/communications, follow-ups, workflows, reports, knowledge, alerts, audit, backups, customer/job context, field/mobile flows, bilingual UI, offline behavior, and Ask OTTO.

Provider-backed features may degrade gracefully when a provider is not configured, but their absence must not break local CRM workflows.

## Supabase removal scope
Remove or retire from the active build:
- Supabase sign-in/session dependency.
- `/api/data` cloud synchronization dependency.
- Supabase photo/file upload dependency where local attachment handling already exists.
- Supabase-specific registration/invitation UI.
- Supabase environment-variable requirements from active setup instructions.
- Supabase migrations/configuration from the active application path.

Keep historical files only when needed for rollback/history; mark them retired rather than presenting them as current setup.

## Reliability
Local writes must remain immediately durable through the existing IndexedDB/local recovery path. Removing cloud sync must not cause data loss, blank startup states, or repeated 'retrying cloud' indicators.

Failed optional provider operations should remain isolated from core CRUD operations. Core local create/edit/delete/recover behavior must work without network access.

## UI system
Create a project-root `DESIGN.md` and `UX-CONTRACT.md` as the durable NBO archetype contract. Runtime styles remain token-driven from the shell. Reuse one navigation language, one button hierarchy, one form language, one toast/feedback pattern, one dialog pattern, and one record-header pattern.

Desktop keeps the restrained left rail. Phone keeps the bottom navigation. Secondary tools remain under More. Do not promote features merely because they exist.

## Verification
The release is acceptable only when:
- the complete repository test command passes;
- `node scripts/qa-check.mjs` passes;
- local profile selection enters the correct role experience for Otto, Julio, Sarays, and EJN;
- no active startup or normal CRUD flow calls Supabase;
- owner/office primary navigation and More continue to expose the full feature set;
- representative customer, job, employee, HR/payroll, money, file, and AI surfaces remain reachable;
- English/Spanish and desktop/phone behavior remain intact;
- the app loads and works with network access unavailable for core local operations;
- no new JavaScript errors, broken images, or unintended horizontal overflow are introduced.
