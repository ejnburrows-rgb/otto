# OTTO / NBO Hybrid CRM UX Contract

## Product model
OTTO is a complete business operating system. Simplicity is achieved by context and progressive disclosure, never by deleting necessary business capability.

## Navigation
Owner and office users have exactly five primary destinations: Today, Schedule, Jobs, Customers, Money. Desktop uses the left rail. Phone uses the bottom navigation. Secondary capabilities live under More and keep their existing routes.

The current primary destination remains visually selected while a related secondary/detail route is open. More is a launcher, not another dashboard.

## Record context
Customer, job, and employee records are contextual workspaces.

A customer workspace may expose connected work, money, communications, notes, files/photos, and history without requiring users to rediscover the customer in another module.

A job workspace may expose customer, schedule, assignee, files/photos, checklist, estimate/invoice, time, communications, and AI context.

An employee workspace may expose role/profile, assigned work, hours, payroll records, PTO, policies, documents, and messages.

Context does not duplicate business logic; it links or renders existing canonical records/actions.

## Local profiles
The active local-first phase contains four protected administrator identities: Otto (`owner-1`, owner), Julio (`owner-2`, owner), Sarays (`ops-1`, office), and EJN (`it-admin-ejn`, owner/NBO administrator).

The profile chooser identifies the current user and switches the local session. It never asks for or stores a hardcoded password/PIN. Existing field-worker records remain in the Team database.

Changing profile is an explicit action from a compact identity control. It is not a sixth primary navigation destination.

## Persistence and offline behavior
IndexedDB is the active working database. localStorage may hold recovery/session mirrors already used by the application. A successful local write is immediately reported as saved after local persistence is queued/completed; normal UI must not wait for Supabase confirmation.

Core CRUD remains usable with no network. No normal startup, save, customer/job/employee edit, or local file lookup requires Supabase.

Provider-backed optional features must fail independently and explain the unavailable provider without invalidating the underlying local record.

## Search and Ask OTTO
Search deterministic local business data first. Ask OTTO may use an external model only for tasks that benefit from generation, interpretation, extraction, or summarization.

Consequential AI-proposed record changes require preview/confirmation before saving. Search/AI remains one command surface and does not create a competing floating launcher.

## Forms and CRUD
Use labels with native form semantics. Validation remains inline; entered values are preserved on failure. Save/Create labels describe the actual action. Busy controls keep stable geometry and block duplicate submission.

Routine create/edit follows the owning record/list behavior already established by the canonical screen. Destructive actions use app-owned confirmation and name the object/consequence. Browser `alert`, `confirm`, and `prompt` are not introduced.

## Feedback
Use the application's shared toast/status language. A toast acknowledges; correctable errors stay inline. Local persistence should show Saved, not cloud-retry language. Empty states tell the user what can be done next and never fabricate example business data inside production records.

## Tables and lists
Operational lists remain bounded and scannable. Filters, sort, statuses, and row actions use consistent labels and focus/hover treatment. Color is never the only signal for state.

## Responsive behavior
Desktop retains the left rail and generous content canvas. Phone retains the bottom navigation and full content width. Touch targets remain practical; filters/tabs wrap rather than disappear. No screen introduces horizontal page overflow to fit desktop controls.

## Locale
English and Spanish are feature-equivalent. New labels, states, errors, dialogs, empty states, and accessible names must provide both languages through the existing localization model.

## Accessibility
Target WCAG 2.2 AA. Use semantic buttons/links, visible focus, keyboard-operable dialogs/menus, useful accessible names, stable focus restoration, readable contrast, and reduced-motion support.

## Visual consistency
`DESIGN.md` is the durable taste contract. `otto-shell.css` owns existing semantic shell tokens. `otto-nbo-hybrid.css` refines the same semantic system and must not create an unrelated second theme.

## Release acceptance
A UI/auth/persistence change is not complete until source tests, `qa-check`, browser QA at phone and desktop widths, English/Spanish, offline core behavior, and JavaScript/runtime-error checks pass. Production claims require direct production evidence after merge/deploy.
