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

The current UI objective is explicit: owner and office users use a wallpaper-first workspace with **three primary windows open together** — Today, Field Workers, and Inbox. Each window may minimize, restore, maximize inside the workspace, and enter full screen. Desktop uses the left-side workspace rail; phones present the same primary actions in a compact bottom dock so working content receives the full phone width. Drag/reorder is intentionally excluded because the earlier drag implementation interfered with normal scrolling. The remaining UI work is refinement, not another redesign: clearer hierarchy, consistent secondary screens, restrained effects, practical touch targets, and accessible interaction.

For file handling, use one **Upload / Import** intake model. Spreadsheets are parsed directly, photos/scans use bilingual browser OCR, CAD files reuse the existing job drawing pipeline, and PDF asks one simple document-vs-plan choice because it is ambiguous. All applicable flows end in review before save. Do not restore separate provider-key OCR or competing upload systems.

## Current product truth

- The owner/office UI contract is the three-window workspace described above. A previous one-panel-at-a-time redesign is superseded and must not be restored as the default.
- Desktop keeps the left-side primary launcher. On phones the same primary workspace actions use a bottom dock; do not squeeze the working windows beside a narrow desktop rail.
- Julio (`owner-2`) uses green interface accents and his committed wallpaper. Saray (`ops-1`) uses pink interface accents and her committed wallpaper. Otto keeps the blue OTTO identity. These accents follow the signed-in person; workflow and permissions do not change by colour.
- The supplied OTTO Plumbing wordmark (`logo.jpg`) remains the CRM logo. Do not substitute the wrench/person app icon as the top-bar brand.
- Today has subtle operational priority, but the interface remains restrained. Do not add excessive glass, animation, heavy shadows, neon effects, or decorative dashboards to make the app look more “premium.”
- Secondary screens must feel like the same product as Home: consistent Hanken Grotesk hierarchy, spacing, cards, lists, forms, focus treatment, buttons, wrapped filters/tabs, and intentional empty/error/confirmation states.
- Worker information is intentionally operational and compact: current job, next job, actual hours recorded from job check-in/check-out, and time-off status. Do not restore random heatmaps, fabricated KPI hours, vanity location counts, login-history cards, or fake charts as worker performance information.
- The whole field crew has a Crew Hours view showing real recorded hours today, real recorded hours this week, and how many workers are currently clocked in.
- Plans & AutoCAD is a first-class work entry point. It accepts PDF, DWG, DXF, DWF and DGN through the existing job-document/drawing pipeline; do not bury this capability only inside a job tab.
- Upload/import/OCR follows `docs/UNIFIED-FILE-INTAKE.md`: one front door, direct spreadsheet parsing, browser bilingual OCR for images/scans, existing CAD analysis for plans, explicit PDF routing, review before save, Field Worker-only employee imports, no PIN import, and no fabricated attendance.
- Tools stays a restrained launcher for core daily modules. Secondary technical screens must not be promoted merely because they exist in code.
- Admin Settings is intentionally simplified. Keep appearance, team access, owner security, data safety and sign-out visible. Provider keys and unfinished setup stubs do not belong in the normal owner/office settings experience.
- The local/offline CRM and built-in demo are present.
- Sensitive server features remain intentionally blocked by the fail-closed security gate. This is the safe production state until issue #70 ships a fresh, verified server-authorization implementation from current `main`.
- The older auth attempt in PR #103 was reviewed and closed unmerged; it must not be resurrected wholesale.
- Photo upload must never silently abandon a locally stored job photo; pending uploads stay queued and visibly pending until they succeed or the user takes an explicit action.
- Live Supabase contains later duplicate/demo rows tracked in issue #111. Reconciliation requires backup, dependency review, and explicit approval before live deletion.
- QuickBooks is explicitly out of scope. `docs/NO-QUICKBOOKS.md` is authoritative; do not restore Intuit routes, UI, credentials, tests, or deployment requirements without a new explicit requirement.
- GitHub Actions cannot be trusted as release evidence until a successful current run is proven. If Actions is unable to start because of an account/billing condition, record that as an external verification blocker rather than calling the code failed.

## Priority order

1. **Finish and prove the owner/office UI refinement** — preserve three simultaneous windows and identity treatment while proving desktop left rail, phone bottom dock, minimize/restore/maximize/full-screen behavior, restrained hierarchy, consistent secondary screens, practical touch targets, bilingual parity and accessibility.
2. **Unified file intake** — one Upload / Import surface for spreadsheet employee import, bilingual OCR, and job-linked plans; no conflicting old user-facing scan/upload flows; prove review-before-save behavior.
3. **Photo-upload reliability** — never silently abandon a locally stored job photo; keep retrying and show a clear pending/not-sent state.
4. **Server authorization (#70)** — build fresh from current `main` using provider-backed identity plus explicit role and record-level authorization. Preserve offline PIN unlock.
5. **Cross-device proof** — prove authorized records and photo bytes reach the correct owner/office/field users without exposing unrelated records.
6. **Duplicate live-data reconciliation (#111)** — back up first, remove only verified duplicate/demo rows and their linked seeded activity, and prove no genuine business data was lost. No delete is authorized until the exact rows and dependent records are approved.
7. **Notifications only after authenticated server access is proven.** QuickBooks is not part of this product scope.
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

1. Do not replace the three-window owner/office home with a single active panel.
2. Do not remove minimize, restore, maximize, or full-screen behavior unless the owner explicitly changes the requirement.
3. Desktop uses the left-side primary launcher; phone uses the compact bottom dock. Do not force the desktop rail into the narrow phone workspace.
4. Do not reintroduce generic drag/reorder behavior on scrollable cards or lists.
5. Do not change Julio away from green accents or Saray away from pink accents.
6. Do not invent an Otto wallpaper; Otto may use the finished base surface unless a real approved asset is supplied.
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
- desktop left-rail and phone bottom-dock behavior are both exercised,
- Julio, Saray and Otto are each checked for correct identity treatment,
- minimize/restore/maximize/full-screen is exercised for all three home windows,
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
