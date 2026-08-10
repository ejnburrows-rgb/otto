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

The work is organized around one outcome: the app must truthfully show what works, clearly show what is blocked, protect customer data, and support a clean built-in demo.

## Current product truth

- The final owner/office home redesign is merged into `main`: a permanent left rail for Today, Field Workers, Inbox, and Tools, with one active panel at a time and explicit Back controls.
- The local/offline CRM and built-in demo are present.
- Sensitive server features remain intentionally blocked by the fail-closed security gate. This is the safe production state until issue #70 ships a fresh, verified server-authorization implementation from current `main`.
- The older auth attempt in PR #103 was reviewed and closed unmerged; it must not be resurrected wholesale.
- Photo upload currently gives up after repeated failures by deleting its retry-queue entry while leaving the local photo visible. That can make a field user believe a photo reached the office when it did not.
- Live Supabase still contains ten later duplicate/demo job rows plus seeded activity. Reconciliation is tracked in issue #111 and requires backup, dependency review, and explicit approval before any live deletion.
- QuickBooks is explicitly out of scope. `docs/NO-QUICKBOOKS.md` is authoritative; do not restore Intuit routes, UI, credentials, tests, or deployment requirements without a new explicit requirement.
- The public OTTO website is live on its cleaned delivery build. Its remaining infrastructure issue is automatic GitHub `main` → Vercel deployment, tracked in issue #110.
- GitHub Actions cannot be trusted as release evidence until a successful current run is proven.

## Priority order

1. **Repository governance cleanup** — keep one current control system, retire contradictory handoffs, and reduce stale branch/PR/issue clutter using current GitHub evidence.
2. **Photo-upload reliability** — never silently abandon a locally stored job photo; keep retrying and show a clear pending/not-sent state.
3. **Server authorization (#70)** — build fresh from current `main` using provider-backed identity plus explicit role and record-level authorization. Preserve offline PIN unlock.
4. **Cross-device proof** — prove authorized records and photo bytes reach the correct owner/office/field users without exposing unrelated records.
5. **Duplicate live-data reconciliation (#111)** — back up first, remove only verified duplicate/demo rows and their linked seeded activity, and prove no genuine business data was lost. No delete is authorized until the exact rows and dependent records are approved.
6. **OCR reliability and error clarity.**
7. **Notifications only after authenticated server access is proven.** QuickBooks is not part of this product scope.
8. **Vercel Git integration (#110)** — restore automatic website production deployments from current GitHub `main` and prove the trigger with an exact commit.
9. **Final production readiness** — fresh tests, real-browser verification, demo verification, deployment proof, and director sign-off.

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

Agents may investigate, recommend, implement approved work on branches, verify it, open pull requests, and merge only under the rules in `AGENTS.md`.

## Definition of done

A task is complete only when all applicable evidence exists:

- the full current test suite passes with zero failures,
- `node scripts/qa-check.mjs` reports a passing result,
- the real app is opened and exercised in a browser,
- no new JavaScript errors, broken images, or mobile overflow appear,
- a screenshot or equivalent direct evidence proves the visible result,
- the pull request is reviewed against the stated acceptance criteria,
- and `docs/STATUS.md` is updated with one factual dated line.

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