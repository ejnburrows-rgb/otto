# OTTO Repository Control Center

This is the current control point for the repository. It is not a restart. It tells every agent what to read, what the project is trying to finish, what must not be changed casually, and how completion is proven.

## Read order

1. `AGENTS.md` — permanent safety and working rules.
2. This file — current objective, priorities, and authority.
3. `docs/STATUS.md` — factual product state and incident history.
4. `docs/DECISIONS.md` — why major technical choices were made.
5. Task-specific files only when they are named by the current objective.

No other Markdown file may silently become a competing source of truth. Historical reports, old task queues, and tool-specific prompts are reference material only unless this file explicitly activates them.

## Current objective

Finish OTTO as a dependable, demo-ready and production-ready plumbing CRM without redoing completed work.

The current UI objective is now explicit and must not be simplified away again: owner and office users use a wallpaper-first desktop workspace with **three primary windows open together** — Today, Field Workers, and Inbox. Each window may minimize to the left side panel, maximize inside the workspace, enter full screen, and restore. Drag/reorder is intentionally excluded because the earlier drag implementation interfered with normal scrolling.

## Current product truth

- The owner/office UI contract is the three-window workspace described above. A previous one-panel-at-a-time left-rail redesign is superseded and must not be restored as the default.
- Julio (`owner-2`) uses green interface accents and his committed wallpaper. Saray (`ops-1`) uses pink interface accents and her committed wallpaper. Otto keeps the blue OTTO identity. These accents follow the signed-in person; the workflow and permissions do not change by colour.
- The supplied OTTO Plumbing wordmark (`logo.jpg`) remains the CRM logo. Do not substitute the wrench/person app icon as the top-bar brand.
- Worker information is intentionally operational and compact: current job, next job, actual hours recorded from job check-in/check-out, and time-off status. Do not restore random heatmaps, fabricated KPI hours, vanity location counts, login-history cards, or fake charts as worker performance information.
- The whole field crew has a Crew Hours view showing real recorded hours today, real recorded hours this week, and how many workers are currently clocked in.
- Plans & AutoCAD is a first-class work entry point. It accepts PDF, DWG, DXF, DWF and DGN through the existing job-document/drawing pipeline; do not bury this capability only inside a job tab.
- Tools stays a restrained launcher for the core daily modules. Secondary technical screens must not be promoted merely because they exist in code.
- Admin Settings is intentionally simplified. Keep appearance, team access, owner security, data safety and sign-out visible. Provider keys and unfinished setup stubs do not belong in the normal owner/office settings experience.
- The local/offline CRM and built-in demo are present.
- Sensitive server features remain intentionally blocked by the fail-closed security gate. This is the safe production state until issue #70 ships a fresh, verified server-authorization implementation from current `main`.
- The older auth attempt in PR #103 was reviewed and closed unmerged; it must not be resurrected wholesale.
- Photo upload must never silently abandon a locally stored job photo; pending uploads stay queued and visibly pending until they succeed or the user takes an explicit action.
- Live Supabase contains later duplicate/demo rows tracked in issue #111. Reconciliation requires backup, dependency review, and explicit approval before live deletion.
- QuickBooks is explicitly out of scope. `docs/NO-QUICKBOOKS.md` is authoritative; do not restore Intuit routes, UI, credentials, tests, or deployment requirements without a new explicit requirement.
- GitHub Actions cannot be trusted as release evidence until a successful current run is proven. If Actions is unable to start because of an account/billing condition, record that as an external verification blocker rather than calling the code failed.

## Priority order

1. **Finish and prove the owner/office workspace** — three simultaneous windows, minimize/restore/maximize/full-screen behavior, correct Julio/Saray/Otto identity, visible Plans & AutoCAD, real Crew Hours, simplified worker information, responsive layouts, bilingual parity and accessibility.
2. **Photo-upload reliability** — never silently abandon a locally stored job photo; keep retrying and show a clear pending/not-sent state.
3. **Server authorization (#70)** — build fresh from current `main` using provider-backed identity plus explicit role and record-level authorization. Preserve offline PIN unlock.
4. **Cross-device proof** — prove authorized records and photo bytes reach the correct owner/office/field users without exposing unrelated records.
5. **Duplicate live-data reconciliation (#111)** — back up first, remove only verified duplicate/demo rows and their linked seeded activity, and prove no genuine business data was lost. No delete is authorized until the exact rows and dependent records are approved.
6. **OCR/drawing reliability and error clarity.**
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
3. Do not reintroduce generic drag/reorder behavior on scrollable cards or lists.
4. Do not change Julio away from green accents or Saray away from pink accents.
5. Do not invent an Otto wallpaper; Otto may use the finished base surface unless a real approved asset is supplied.
6. Do not hide Plans & AutoCAD solely inside a job detail screen.
7. Do not calculate hours from placeholder formulas. Crew hours come from recorded check-in/check-out time.
8. Do not present random/demo chart values as worker performance.
9. Do not replace the supplied OTTO Plumbing logo with the app icon.
10. Do not expose technical integration setup simply to make Settings look fuller.

## Definition of done

A task is complete only when all applicable evidence exists:

- the full current test suite passes with zero failures,
- `node scripts/qa-check.mjs` reports a passing result,
- the real app is opened and exercised in a browser,
- no new JavaScript errors, broken images, or mobile overflow appear,
- UI work is checked at desktop and phone widths,
- Julio, Saray and Otto are each checked for correct identity treatment,
- minimize/restore/maximize/full-screen is exercised for all three home windows,
- Plans & AutoCAD upload is opened through the dedicated hub and linked to a job,
- Crew Hours is checked against known check-in/check-out records,
- a screenshot or equivalent direct evidence proves the visible result,
- the pull request is reviewed against the stated acceptance criteria,
- and `docs/STATUS.md` receives one factual dated update.

Never hardcode a test count into permanent instructions. Report the actual count from the run.

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
