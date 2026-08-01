# Repository Realignment Template

Use this template when an existing project has accumulated multiple agents, stale branches, conflicting Markdown files, or uncertain deployment state. The goal is a clean continuation point, not a rebuild.

## Phase 1 — Confirm reality

Verify from the repository and live systems:

- exact repository owner/name,
- default branch and current commit,
- local versus remote operating mode,
- deployment target and deployed commit,
- open pull requests and issues,
- current branch count,
- current test evidence,
- and whether write access exists.

Never accept an old report as current proof.

## Phase 2 — Map the repo brain

Find every file that can instruct an agent, including:

- `AGENTS.md`,
- tool-specific instruction files,
- status and handoff documents,
- decision logs,
- autonomous loops,
- task queues,
- hooks, workflows, and cleanup scripts.

Classify each as:

- keep,
- update,
- archive,
- delete,
- do not touch,
- or director decision.

There must be one permanent rules file and one current control file. Tool-specific files should point to them instead of copying changing facts.

## Phase 3 — Establish the control center

Create a current control document that states:

- the product goal,
- current verified truth,
- priority order,
- decision rights,
- definition of done,
- evidence requirements,
- branch policy,
- and the exact read order for every agent.

Do not mix current state with long incident history. Keep history in a separate status or decisions log.

## Phase 4 — Reconcile branches and pull requests

For every branch, determine:

- whether it is merged,
- whether equivalent work exists in the default branch,
- whether it contains unique useful files,
- whether it is an active workspace,
- and whether deletion is safe.

A different tip commit does not prove a branch is unmerged. Compare actual history and content.

Keep all open pull-request branches. Review closed-unmerged branches individually. Generate cleanup instructions from live evidence, never from a stale script.

## Phase 5 — Prove the current product

Run the repository's actual verification process against the current default branch:

- install dependencies,
- run the complete test suite,
- run static or wiring checks,
- open the real application,
- test phone and desktop widths,
- inspect console errors and broken assets,
- confirm the live deployment commit,
- and verify the built-in demo if one exists.

Record the output. Never hardcode a test count into permanent governance files.

## Phase 6 — Create the finish plan

Convert findings into one ordered plan focused on finishing the product:

1. safety or data-loss blockers,
2. truthful user-facing behavior,
3. core architecture blockers,
4. incomplete product functions,
5. production readiness,
6. client delivery and maintenance.

Each item must include the problem, why it matters, acceptance criteria, evidence required, and any director decision.

## Phase 7 — Implement through one governance pull request

The realignment pull request should normally:

- add or update the control center,
- make agent entry files thin pointers,
- mark obsolete loops and task queues historical,
- refresh the current handoff/status baseline,
- add the branch decision inventory,
- and preserve historical evidence without letting it control new work.

Do not mix product feature changes into the governance pull request.

## Phase 8 — Close the session

A realignment session is complete when:

- every agent receives the same instructions,
- current state is separated from history,
- branch and PR decisions are documented,
- current verification evidence is recorded,
- the finish plan is ordered and approved,
- irreversible actions are identified but not performed without authorization,
- and the repository can brief a new agent without the owner repeating the project story.

## Standard agent report

Every report should contain only:

### Goal

### Verified current state

### What needs fixing and why

### What will be done in this pass

### Evidence produced

### Director decisions required

### Not done yet
