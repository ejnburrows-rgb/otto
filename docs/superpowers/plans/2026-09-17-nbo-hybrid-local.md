# NBO Hybrid Local CRM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert OTTO into the first NBO hybrid CRM archetype: full OTTO capability, calmer Tucker-influenced UX, preconfigured local profiles, and no active Supabase dependency.

**Architecture:** Keep the proven OTTO feature modules and minimal shell, then add one authoritative local-first compatibility layer that runs after legacy materializers and disables cloud-auth/sync behavior without deleting business features. Create durable DESIGN/UX contracts, preserve the existing four administrator IDs, and keep IndexedDB/local recovery as the active source of truth. The remote Supabase project remains untouched as rollback insurance.

**Tech Stack:** HTML/CSS/JavaScript PWA, IndexedDB, localStorage recovery/session mirror, Service Worker, Vercel static/serverless hosting, existing Node verification scripts.

**Spec:** `docs/superpowers/specs/2026-09-17-nbo-hybrid-local-design.md`

## Global Constraints
- Preserve all working CRM modules, field workflows, HR/payroll, money, files, bilingual UI, offline behavior, and Ask OTTO.
- Active runtime must not require Supabase auth, REST data sync, storage, or Supabase environment variables.
- Preserve `owner-1` Otto, `owner-2` Julio, `ops-1` Sarays/office, and `it-admin-ejn` EJN administrator IDs.
- Never invent passwords, PINs, email addresses, or secrets.
- Keep five primary owner/office destinations: Today, Schedule, Jobs, Customers, Money; everything else stays under More.
- Desktop uses left rail; phone uses bottom navigation.
- Remote Supabase project is not deleted.
- Core local CRUD must work without network access.

---

### Task 1: Establish the durable NBO UI and behavior contracts

**Files:**
- Create: `DESIGN.md`
- Create: `UX-CONTRACT.md`
- Create: `premium-ui.json`

**Interfaces:**
- Produces visual tokens, navigation rules, record-context rules, feedback/state rules, responsive rules, and verification commands used by later UI work.

- [ ] Write `DESIGN.md` with the existing neutral OTTO palette, Geist/Inter typography, restrained surface/elevation grammar, Tucker-inspired spacing/hierarchy, and contextual-workspace signature.
- [ ] Write `UX-CONTRACT.md` defining five-primary-navigation behavior, More grouping, local profile selection, CRUD feedback, dialogs, offline/local persistence states, record context, English/Spanish parity, and accessibility.
- [ ] Add `premium-ui.json` pointing static checks at the project root and existing verification commands.
- [ ] Run DESIGN lint and the premium static audit; fix blocking findings.

### Task 2: Add the local-first runtime and preconfigured profiles

**Files:**
- Create: `otto-local-runtime.js`
- Create: `scripts/apply-nbo-hybrid-local-patch.mjs`
- Create: `scripts/test-nbo-hybrid-local.mjs`
- Modify: `package.json`
- Modify through materializer: `index.html`, `sw.js`

**Interfaces:**
- Produces `window.__nboLocalMode`, local profile chooser behavior, local-only `save()`, no-op cloud push, and boot behavior that never initializes Supabase.
- Consumes existing `db`, `session`, `idbPut`, `idbGet`, `startApp`, `render`, `setLang`, role/capability functions, and service-worker cache conventions.

- [ ] Write failing assertions proving transformed `index.html` contains no active Supabase initialization at boot, local save confirms immediately, and the four protected profiles are seeded by ID/role.
- [ ] Implement `apply-nbo-hybrid-local-patch.mjs` as an idempotent final materializer that replaces cloud boot/auth/save functions, injects `otto-local-runtime.js`, removes cloud-only retry messaging, and adds the runtime to the service-worker cache.
- [ ] Implement `otto-local-runtime.js` profile chooser/switcher using existing users and roles; never contain passwords/PINs/secrets.
- [ ] Update `package.json` so the final local materializer runs after existing materializers for dev/start/preview/test/build/qa/verify paths and `scripts/test-nbo-hybrid-local.mjs` is included in test gates.
- [ ] Run the focused local-mode test until it passes.

### Task 3: Retire Supabase from the active application path without deleting rollback history

**Files:**
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `docs/REPO-CONTROL.md`
- Modify: `docs/DECISIONS.md`
- Modify: `docs/STATUS.md`
- Keep historical: `supabase/`, `api/data.js`, `api/save.js`, `api/_lib/serverAuth.js`, `api/photos.js`, portal cloud routes, unless a later cleanup explicitly removes them.

**Interfaces:**
- Active product docs and setup no longer instruct operators to configure Supabase.
- Historical/cloud code remains dormant and cannot be reached by normal local boot/save behavior.

- [ ] Replace active setup language with IndexedDB/local-first operating truth and mark Supabase integration historical/dormant.
- [ ] Remove Supabase environment variables from the active required-variable list while preserving optional external-provider variables used by non-core features.
- [ ] Document that customer-portal/cloud cross-device functions are dormant in this local-only phase instead of claiming they still work.
- [ ] Update STATUS with the exact changed/verified state only after tests complete.

### Task 4: Apply the Tucker/OTTO hybrid UI lift as one design layer

**Files:**
- Create: `otto-nbo-hybrid.css`
- Create: `otto-nbo-hybrid.js`
- Modify through materializer: `index.html`, `sw.js`
- Test: `scripts/test-nbo-hybrid-local.mjs`

**Interfaces:**
- Consumes existing shell markup/classes and route/state functions.
- Produces consistent contextual headers, calmer density, better typography/spacing, stronger hover/focus states, stable cards/forms/tables, and profile switch access.

- [ ] Add failing tests proving the hybrid stylesheet/runtime load after OTTO shell layers and are cached offline.
- [ ] Implement a restrained UI lift: wider content rhythm, stronger heading scale, flatter panels, clearer list rows, consistent forms/buttons/tabs/dialogs, visible focus, touch-safe targets, stable mobile spacing, and reduced-motion handling.
- [ ] Add a compact signed-in profile control that shows the current local identity and opens the profile chooser without becoming another primary navigation destination.
- [ ] Improve customer/job/employee contextual presentation using existing record data and routes; do not duplicate business logic or create fake metrics.
- [ ] Verify no feature is promoted from More merely for visibility.

### Task 5: Preserve working features while replacing cloud assumptions in tests

**Files:**
- Modify only tests whose assertions describe Supabase as mandatory current product truth: `scripts/test-pin.mjs`, `scripts/test-field-workspace.mjs`, `scripts/test-authoritative-persistence.mjs`, and other directly conflicting current-truth tests discovered by the full run.
- Do not weaken unrelated security/provider tests for dormant server routes.

**Interfaces:**
- Test suite describes local-first product truth while still testing any retained dormant server modules in isolation.

- [ ] Change tests from “Supabase is the only sign-in/source of truth” to “local profile selection and IndexedDB are active; cloud modules are dormant.”
- [ ] Keep tests for role boundaries, field data scoping logic, file safety, AI provider limits, and other non-Supabase feature behavior where still applicable.
- [ ] Run the complete `npm test`; fix only failures caused by the approved architecture change or genuine regressions.
- [ ] Run `node scripts/qa-check.mjs` and the configured premium/static UI audit.

### Task 6: Browser/release verification and merge

**Files:**
- Final factual update: `docs/STATUS.md`

**Interfaces:**
- Produces release evidence for merge.

- [ ] Build the branch and verify the production build gate/CI result.
- [ ] Exercise the preview in a real browser at desktop and phone widths: profile selection for Otto/Julio/Sarays/EJN, Today/Schedule/Jobs/Customers/Money, More, representative HR/payroll, files/plans, money, customer/job/team detail, Ask OTTO fallback, English/Spanish, and offline/core local save behavior.
- [ ] Confirm zero new JavaScript errors, broken images, unintended horizontal overflow, and no normal Supabase network requests.
- [ ] Open a PR with the approved acceptance criteria and evidence.
- [ ] Review the final diff, merge after required checks are clean, and confirm the resulting `main` commit/deployment state without deleting the remote Supabase project.
