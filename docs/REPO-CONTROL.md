# OTTO Repository Control Center

This is the current control point for the repository. It is not a restart. It tells every agent what to read, what the project is trying to finish, what must not be changed casually, and how completion is proven.

## Read order

1. `AGENTS.md` — permanent safety and working rules.
2. This file — current objective, priorities, and authority.
3. `docs/STATUS.md` — factual product state and incident history.
4. `docs/DECISIONS.md` — why major technical choices were made.
5. `docs/UNIFIED-FILE-INTAKE.md` — authoritative when working on uploads, imports, OCR, or Plans & AutoCAD.
6. Other task-specific files only when they are named by the current objective.

No other Markdown file may silently become a competing source of truth. Historical reports, old task queues, and tool-specific prompts are reference material only unless this file explicitly activates them.

## Current objective

Finish OTTO as a dependable, demo-ready and production-ready plumbing CRM without redoing completed work.

The current UI objective is explicit, and the director changed it on 2026-08-14. Owner and office users use a **minimal application shell**: a dark left sidebar on desktop carrying five primary destinations — Today, Schedule, Jobs, Customers, Money — one Search / Ask OTTO command entry (⌘K), and a **More** menu that holds every secondary feature; phones use a bottom bar with Today, Schedule, Jobs, Customers, More so working content receives the full phone width. Home is a Today screen: a short summary, today's jobs as the dominant section, Needs attention, and Recent activity, all read from real records. The wallpaper-first workspace with three floating windows and minimize/maximize/full-screen controls is **superseded** and must not be restored as the default; its runtime is retained in `otto-home.js` / `otto-home.css` and must not be deleted. Drag/reorder stays excluded because the earlier drag implementation interfered with normal scrolling. The remaining UI work is refinement, not another redesign, and the shell has not yet been propagated to secondary screens beyond inheriting its palette and typography.

For file handling, use one **Upload / Import** intake model. Spreadsheets are parsed directly, photos/scans use bilingual browser OCR, CAD files reuse the existing job drawing pipeline, and PDF asks one simple document-vs-plan choice because it is ambiguous. All applicable flows end in review before save. Do not restore separate provider-key OCR or competing upload systems.

## Current product truth

- The owner/office UI contract is the minimal application shell described above.
- Desktop keeps a left sidebar; phones use a bottom bar. Do not force the desktop sidebar into the narrow phone width.
- The shell uses one fixed neutral palette (`#F7F7F8` page, `#FFFFFF` surface, `#111214` sidebar, `#2563EB` accent) and one typeface (Geist, falling back to Inter). Owner/office screens are light-only while the shell is active. Julio (`owner-2`), Saray (`ops-1`) and Otto keep their identity data and wallpaper assets, but the per-person accent and wallpaper treatment does not apply inside the shell.
- The supplied OTTO Plumbing wordmark (`logo.jpg`) remains the CRM logo. Do not substitute the wrench/person app icon as the top-bar brand.
- Today has subtle operational priority, but the interface remains restrained. Do not add excessive glass, animation, heavy shadows, neon effects, or decorative dashboards to make the app look more “premium.”
- Secondary screens must feel like the same product as Home: consistent Geist hierarchy, spacing, cards, lists, forms, focus treatment, buttons, wrapped filters/tabs, and intentional empty/error/confirmation states.
- Worker information is intentionally operational and compact: current job, next job, actual hours recorded from job check-in/check-out, and time-off status. Do not restore random heatmaps, fabricated KPI hours, vanity location counts, login-history cards, or fake charts as worker performance information.
- The whole field crew has a Crew Hours view showing real recorded hours today, real recorded hours this week, and how many workers are currently clocked in.
- Plans & AutoCAD is a first-class work entry point. It accepts PDF, DWG, DXF, DWF and DGN through the existing job-document/drawing pipeline; do not bury this capability only inside a job tab.
- Upload/import/OCR follows `docs/UNIFIED-FILE-INTAKE.md`: one front door, direct spreadsheet parsing, browser bilingual OCR for images/scans, existing CAD analysis for plans, explicit PDF routing, review before save, Field Worker-only employee imports, no PIN import, and no fabricated attendance.
- More stays a restrained launcher for everything outside the five primary destinations. Secondary technical screens must not be promoted into primary navigation merely because they exist in code.
- Admin Settings is intentionally simplified. Keep appearance, team access, owner security, data safety and sign-out visible. Provider keys and unfinished setup stubs do not belong in the normal owner/office settings experience.
- The local/offline CRM and built-in demo are present.
- Supabase-backed identity and server-controlled OTTO roles are implemented on current `main`. Anonymous requests fail before provider/business access, and field records are restricted to the employee and assigned work.
- The older auth attempt in PR #103 was reviewed and closed unmerged; it must not be resurrected wholesale.
- Photo upload must never silently abandon a locally stored job photo; pending uploads stay queued and visibly pending until they succeed or the user takes an explicit action.
- Live Supabase currently contains only Julio, Sarays, and Otto administrator profiles; customer and job collections are empty.
- QuickBooks is a manual handoff only: copy/export data and open the official site separately. Do not add Intuit OAuth, API synchronization, background syncing, credentials, or duplicate accounting logic.
- GitHub Actions cannot be trusted as release evidence until a successful current run is proven. If Actions is unable to start because of an account/billing condition, record that as an external verification blocker rather than calling the code failed.

## Priority order

1. **Finish and prove the owner/office UI refinement** — keep the minimal shell while proving the desktop sidebar, the phone bottom bar, the Search / Ask OTTO command entry, restrained hierarchy, consistent secondary screens, practical touch targets, bilingual parity and accessibility.
2. **Unified file intake** — one Upload / Import surface for spreadsheet employee import, bilingual OCR, and job-linked plans; no conflicting old user-facing scan/upload flows; prove review-before-save behavior.
3. **Photo-upload reliability** — never silently abandon a locally stored job photo; keep retrying and show a clear pending/not-sent state.
4. **Production release** — publish the current provider-authenticated build and prove anonymous denial plus authorized owner access.
5. **Cross-device proof** — prove authorized records and photo bytes reach the correct owner/office/field users without exposing unrelated records.
6. **Administrator activation** — keep Otto's confirmed email and add confirmed emails for Julio and Sarays; never invent addresses.
7. **Provider delivery proof** — test notifications and server AI only when their company credentials are configured. QuickBooks remains manual handoff only.
8. **Final production readiness** — fresh tests, real-browser verification, demo verification, deployment proof, and director sign-off.

Do not jump to a later item while an earlier item is unresolved unless the earlier item is genuinely blocked and the next item is independent.

## Decision rights

The director approves:

- authentication changes,
- deletion of live data,
- payments or accounting behavior,
- new paid services or dependencies,
- production deployment,
- client-facing commitments,
- and irreversible cleanup.

Agents may investigate, recommend, implement approved work on branches, verify it, open pull requests, and integrate approved work under the rules in `AGENTS.md`.

## UI non-regression rules

The following are product requirements, not optional design suggestions:

1. Do not restore the wallpaper-first workspace, the floating windows, or the desktop-window controls as the owner/office home. They were superseded by the director on 2026-08-14.
2. Do not delete `otto-home.js` or `otto-home.css`; the superseded runtime is retained so its information and behavior stay recoverable.
3. Desktop uses the left sidebar; phone uses the bottom bar. Do not force the desktop sidebar into the narrow phone width.
4. Do not reintroduce generic drag/reorder behavior on scrollable cards or lists.
5. Keep primary navigation to five destinations. Secondary features belong in More; do not promote them back into the sidebar.
6. Do not invent an Otto wallpaper; no wallpaper sits behind operational content in the shell.
7. Do not hide Plans & AutoCAD solely inside a job detail screen.
8. Do not calculate hours from placeholder formulas. Crew hours come from recorded check-in/check-out time.
9. Do not present random/demo chart values as worker performance.
10. Do not replace the supplied OTTO Plumbing logo with the app icon.
11. Do not expose technical integration setup simply to make Settings look fuller.
12. Do not restore separate spreadsheet/OCR/CAD upload experiences that compete with the unified intake model.
13. Do not add visual effects at the expense of hierarchy, readability, touch usability, or consistent secondary screens.

## Definition of done

A task is complete only when all applicable evidence exists:

- the full current test suite passes with zero failures,
- `node scripts/qa-check.mjs` reports a passing result,
- the real app is opened and exercised in a browser,
- no new JavaScript errors, broken images, or mobile overflow appear,
- UI work is checked at desktop and phone widths,
- desktop sidebar and phone bottom-bar behavior are both exercised,
- the Search / Ask OTTO command entry is opened and used,
- representative secondary screens, forms, tabs, empty states, dialogs and confirmations are checked for consistent hierarchy and keyboard/touch usability,
- Plans & AutoCAD upload is opened through the dedicated hub and linked to a job,
- unified intake is exercised with a spreadsheet, an image/scan, a PDF in both routing modes, and a plan format; review-before-save is verified,
- Crew Hours is checked against known check-in/check-out records,
- a screenshot or equivalent direct evidence proves the visible result,
- the pull request is reviewed against the stated acceptance criteria,
- and `docs/STATUS.md` receives one factual dated update.

Never hardcode a test count into permanent instructions. Report the actual result from the run.

## Reporting format

Every agent report must state, in plain language:

- **Works** — verified with evidence.
- **Broken** — confirmed fault and impact.
- **Blocked** — exact dependency and who controls it.
- **Changed** — files and behavior changed.
- **Not done yet** — remaining work.

No evidence receipt means the work is not accepted.

## Branch and pull-request rules

- `main` is the production source of truth.
- Never commit directly to `main`.
- Never force-push or rewrite shared history.
- Work on a focused branch and open a pull request.
- Do not bulk-delete branches from an old report or script. Generate the deletion list from current GitHub evidence.
- An open pull-request branch stays until the pull request is resolved.
- A closed-unmerged branch must be checked for unique useful work before deletion.
- A merged branch may be deleted only after confirming its useful work is present in `main`.

## Instruction-file policy

`AGENTS.md` and this file are the controlling documents.

Tool entry files such as `CLAUDE.md`, `GEMINI.md`, `.cursorrules`, and `.github/copilot-instructions.md` must remain short pointers. They must not duplicate changing facts such as commit IDs, line counts, test totals, branch counts, or task queues.

`docs/PASTE-ME.md` is for environments that do not load repository instructions. It must be regenerated whenever this control system changes materially.

`LOOP-CLAUDE.md` and old autonomous task queues are historical unless explicitly reactivated here. Obsolete tool-specific handoff files that contradict current product decisions should be removed rather than left looking actionable.

## Realignment completion standard

The repository is considered realigned when:

- all agent entry files point to the same read order,
- no active instruction file contains stale test totals or contradictory merge rules,
- obsolete autonomous loops are clearly marked historical or removed,
- the current objective and priority order are documented here,
- branch cleanup uses a current evidence-based inventory,
- and the reusable process in `docs/REALIGNMENT-TEMPLATE.md` can be applied to another repository.
