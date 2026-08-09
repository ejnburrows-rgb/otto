# QWEN HANDOFF — OTTO CRM MINIMAL REDESIGN + FUNCTION VERIFICATION

## Scope lock

Work only in **`ejnburrows-rgb/otto`** on branch **`qwen/otto-crm-minimal-redesign`**.

This session is for the **OTTO CRM only**. Do not redesign or work on the plumbing website/landing page. Do not work on unrelated repositories. Do not merge to `main` without explicit approval.

Before changing application code, confirm the repository, branch, working tree, current app entry point, current navigation, and existing test commands. Resolve questions from the repository before asking the user.

## First action — materialize the supplied wallpapers

Run:

```bash
node scripts/materialize-otto-wallpapers.mjs
```

Then visually verify:

- `design-assets/wallpapers/julio-pablo.avif`
- `design-assets/wallpapers/sarays.avif`

Read `design-assets/wallpapers/README.md` for the exact mapping. These are user-supplied artwork. Do not regenerate, recolor, reinterpret, or replace them.

User identities:

- **Otto** — Owner 1. Otto's final wallpaper is not included in this handoff. Do not invent one.
- **Julio Pablo** — Owner 2. Use the supplied mountain/glowing-rose wallpaper.
- **Sarays** — office manager. Display her identity as **Sarays**, never as “Office Manager.” Use the supplied pink/purple city-at-night wallpaper.

All three use the same CRM interface and functionality. Only identity/wallpaper changes.

---

# Product goal

Keep existing working functionality, but simplify and replace the current cluttered/game-like presentation with a **premium, minimal, professional, calm, obvious interface** built for non-tech-savvy users.

Think ordinary phone-app simplicity, not enterprise-software complexity.

If a user has to stop and figure out how OTTO works, simplify it.

Do not rebuild the application from scratch. Do not delete capabilities just to make navigation smaller.

---

# 1. Wallpaper-first home — no traditional dashboard

The home screen should showcase the user's wallpaper. Do not cover it with a large analytics dashboard, KPI wall, giant sidebar, charts, or dozens of cards.

The home screen should have only four primary working areas:

1. **Today**
2. **Field Workers**
3. **Inbox**
4. **Tools**

Present them as a compact command area toward the bottom of the screen.

Each panel must support these states where appropriate:

- **Collapsed**
- **Compact**
- **Expanded**
- **Full screen**

Provide obvious minimize/expand/full-screen/return controls. The wallpaper should remain visible whenever the user is not actively working in a full-screen workspace.

Do not use mysterious icon-only controls when a short label would make the action clearer.

---

# 2. What each home area means

## Today
Answer: **What is happening today?**

Show only current operational information such as today's jobs/projects, appointments, deadlines, and urgent items. No historical analytics clutter.

## Field Workers
Answer: **Where is everyone supposed to be today, and what does the office need to know?**

Keep it simple and visual. Do not invent a new field-assignment workflow. Reveal worker details only when opened/needed.

## Inbox
Answer: **What needs my attention?**

Where supported by existing CRM functionality, surface important business email, customer/job messages, alerts, notifications, and review items. Do not turn it into a complicated email client.

The plumbing website and website-lead integration are **out of scope for this phase**. Structure Inbox so that such leads can be added later without redesigning it.

## Tools
Put specialized/less-frequent functions here instead of permanently cluttering the home screen.

Audit the real application first. A likely organization is:

- **Money:** Estimates, Invoices, QuickBooks, Payroll
- **Jobs & Documents:** Customers, Jobs, Upload Plan/PDF, Job Documents
- **Business:** Reports and other real existing business functions
- **Settings:** Team, Language, Appearance, account/preferences

Do not create empty categories or invent features. Map the actual functionality found in the repo.

---

# 3. Simplicity rules

Design for a person who is comfortable using apps such as WhatsApp but is not technically sophisticated.

Use:

- plain everyday labels
- large touch targets
- readable typography
- generous spacing
- shallow navigation
- one obvious primary action per screen
- progressive disclosure instead of showing every option at once
- clear back/home behavior
- calm empty states such as “No urgent messages” instead of giant empty tables

Prefer terms such as **Jobs, Customers, Payroll, Upload Plan, Create Estimate, Messages** over technical software terminology.

Routine actions should normally be reachable in one or two obvious interactions from home.

Do not recreate every existing top-level tab. Audit current navigation and move secondary functions under the four primary areas while preserving the underlying capability.

---

# 4. English / Spanish

OTTO must support **English and Spanish** as one application.

The language preference should update the real interface, including navigation, buttons, labels, forms, instructions, alerts, errors, confirmations, statuses, and empty states.

Do not automatically translate customer names, addresses, uploaded documents, or user-entered business notes unless an existing feature explicitly requires it.

Persist the user's language preference where technically appropriate.

Use natural, simple business language in both languages.

---

# 5. Light / Dark mode

OTTO must support **Light Mode and Dark Mode** using one design system.

Light mode: premium white/deep-blue direction.

Dark mode: deep navy/dark surfaces, readable light typography, restrained blue accents, subtle highlights.

Do not create neon borders, excessive glow, arcade effects, or simple color inversion.

Keep the approved wallpapers. Adapt panel opacity/blur/contrast so content remains readable over them.

Persist theme preference where technically appropriate.

Primary workflows must be checked in all four combinations:

- English + Light
- English + Dark
- Spanish + Light
- Spanish + Dark

---

# 6. Logo and AI identity

The current logo and robot-style AI icon are not final approved branding.

Inspect the repo for replacement assets. If the new logo and new AI icon are not actually present, **do not invent final artwork**. Build clean replaceable asset slots/wiring and report the missing final assets.

Remove game-like/futuristic AI treatment from the UX. The assistant should have one simple entry point, preferably **Ask OTTO** (with a natural Spanish equivalent in Spanish mode).

Do not scatter AI buttons everywhere and do not fake AI capabilities that are not implemented.

---

# 7. Preserve functionality before simplifying screens

Before changing a functional screen:

1. identify what it currently does;
2. identify handlers/data/storage/API dependencies;
3. preserve that behavior in the new simplified UI;
4. retest after the visual change.

Do not silently remove capabilities. Do not perform unrelated refactors. Do not add dependencies without a concrete reason.

Once a visual area is approved, use **PATCH MODE**: change only the requested area and preserve approved typography, colors, spacing, wallpapers, navigation, panel behavior, and proportions.

---

# 8. Verify the serious business functions — do not assume

Inspect and actually test the current state of these features. Classify each as **Working / Partial / Placeholder / Broken / Missing** and cite evidence.

## QuickBooks
Determine whether the repo contains a real direct integration, export/import workflow, partial implementation, placeholder, or nonfunctional path. Do not overclaim.

## Payroll
Verify the spreadsheet/Excel upload workflow: accepted input, extraction, calculations, storage, office review, and output.

## PDF / plan reader
Verify the intended flow:

**upload professional job/plan PDF → extract relevant information → apply OTTO pricing/cost data → produce a draft estimate/project-cost result → human review**.

A human review step is expected. Do not claim perfect AI extraction.

## Authentication / employee access
The existing employee PIN/onboarding workflow has already been worked on. Inspect and verify it. Do not redesign it simply because another architecture would be preferable. Change it only for a demonstrated defect/blocker.

---

# 9. Mobile first

Verify the redesign on phone, tablet, and desktop widths.

Required: readable text, large tap targets, no sideways clutter, no critical hover-only actions, usable compact/expanded/full-screen panel states, and sensible portrait behavior.

---

# 10. Work order

Proceed in this order rather than jumping randomly:

1. **Inspect** the current CRM structure, functionality, navigation, tests, and assets.
2. **Materialize and verify** the supplied wallpapers.
3. **Build the design foundation:** tokens, typography, panel system, responsive rules, light/dark architecture, English/Spanish architecture, user wallpaper mapping, replaceable logo/AI asset hooks.
4. **Build the wallpaper-first home** with Today / Field Workers / Inbox / Tools.
5. **Simplify navigation** by mapping existing features under the four primary areas without deleting functionality.
6. **Apply the design to real workflows** using patch-style changes.
7. **Verify serious functions** separately from visual completion.
8. **Run automated + manual verification**, responsive checks, and the four language/theme combinations.
9. **Provide screenshots/evidence** and fix meaningful visual/functional regressions.

Do not stop at a plan. After inspection, execute the work unless a true blocker requires user input.

---

# 11. Evidence and completion rules

Do not say “done,” “working,” or “production ready” based on appearance or code presence alone.

At the end report concisely:

- repository and branch
- commits
- important files changed
- tests run and exact results
- tests not run / blockers
- manual workflows verified
- screenshots or other visual evidence
- mobile status
- English status
- Spanish status
- Light status
- Dark status
- QuickBooks status
- Payroll status
- PDF reader status
- authentication status
- missing final logo/AI assets, if still missing
- remaining risks

Use this final table:

| Area | Status | Evidence | Remaining |
|---|---|---|---|
| Design system | | | |
| Otto identity/wallpaper | | | |
| Julio Pablo wallpaper | | | |
| Sarays wallpaper | | | |
| Wallpaper-first home | | | |
| Today | | | |
| Field Workers | | | |
| Inbox | | | |
| Tools | | | |
| Navigation simplification | | | |
| English | | | |
| Spanish | | | |
| Light Mode | | | |
| Dark Mode | | | |
| Logo replacement wiring | | | |
| Ask OTTO / AI icon wiring | | | |
| QuickBooks | | | |
| Payroll | | | |
| PDF reader | | | |
| Authentication | | | |
| Mobile | | | |
| Deployment/readiness | | | |

Then state only:

## READY FOR REVIEW
What is genuinely safe to demonstrate.

## NOT DONE YET
Anything incomplete, unverified, blocked, or dependent on real client credentials/data.

## NEXT ACTION
The single highest-priority next action.

If appropriate when all requested branch work is complete and verified, open a pull request to `main`, but **do not merge it** without explicit approval.

# Final rule

**Do not make OTTO look powerful by showing everything. Make it powerful by making the right thing easy to find.**
