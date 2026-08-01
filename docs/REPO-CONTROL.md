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

- The current dashboard redesign is already merged into `main`.
- The local/offline CRM and built-in demo are present.
- Sensitive server features remain intentionally blocked by the fail-closed security gate.
- Real server authentication is the main architecture blocker for shared cloud data, cross-device photos, server AI, notifications, and QuickBooks.
- Photo upload failure is not communicated clearly enough to field users.
- OCR failure modes are not distinguished clearly.
- Live duplicate database rows require explicit owner approval before deletion.
- GitHub Actions cannot be trusted until a successful run is proven.

## Priority order

1. **Repository governance realignment** — make all agents read one current control system and retire contradictory instructions.
2. **Truthful user experience** — visible photo-upload failure and accurate blocked-state messaging.
3. **Server authentication plan and implementation** — Supabase Auth, preserving offline PIN unlock.
4. **Cross-device proof** — records and photo bytes reach owner and office users safely.
5. **OCR reliability and error clarity.**
6. **Notifications and QuickBooks activation only after authenticated server access.**
7. **Final production readiness** — fresh tests, real-browser verification, demo verification, deployment proof, and director sign-off.

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

`LOOP-CLAUDE.md` and old autonomous task queues are historical unless explicitly reactivated here.

## Realignment completion standard

The repository is considered realigned when:

- all agent entry files point to the same read order,
- no active instruction file contains stale test totals or contradictory merge rules,
- obsolete autonomous loops are clearly marked historical,
- the current objective and priority order are documented here,
- branch cleanup uses a current evidence-based inventory,
- and the reusable process in `docs/REALIGNMENT-TEMPLATE.md` can be applied to another repository.
