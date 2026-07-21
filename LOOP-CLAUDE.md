# LOOP-CLAUDE.md — self-driving worker loop (Claude Code on the web)

This file turns the ready-to-run task files in `docs/issues/` into a hands-off
loop. Point a **push-capable** agent (Claude Code on the web) at this file and it
drives the queue on its own, one task at a time, respecting the wave rules, until
the queue is empty.

> Why Claude Code and not Jules: the `jules` label on an issue starts the Jules
> background agent, but Jules currently **cannot push** to this repo, so its work
> never lands. This loop runs on Claude Code. Leave new tasks labeled `claude`
> (not `jules`) until the owner grants Jules push access — see
> `docs/OWNER-MANUAL-STEPS.md`.

---

## The one hard rule of this repo: the app is a single file

The entire app is `index.html` (~333 KB). **Two tasks that both edit
`index.html` can never run at the same time** — they would overwrite each other.
That is what the waves are for (`docs/issues/README.md`). `landing.html` is a
separate file, so a landing task can run in parallel with an app task.

## The loop (repeat until no open tasks remain)

1. `git fetch origin && git reset --hard origin/main`.
2. Read `docs/issues/`. Pick the next open task whose **wave is unblocked**
   (every task in every earlier wave is already merged). Never start a second
   `index.html` task while one is in flight.
3. Read that task file top to bottom and do exactly what its
   **"Exactly what to change"** says — only the file(s) named in its `FILES:`
   header. Obey `AGENTS.md` (author `EJN <ejnburrows@gmail.com>` via
   `git commit --author=`, never global config; no "Co-authored-by"/AI names;
   commit `type: short description`; never force-push; never hardcode secrets).
4. Branch off `main` using the task's `BRANCH:` value.
5. **Verify for real** — the bar is `npm test` (the 7-script node suite) **and**
   `node scripts/qa-check.mjs` both green, PLUS the task's own **Proof required**
   (a real Playwright browser screenshot of the fixed screen; the local server is
   `npm run dev` → http://localhost:8000).
6. Open a PR into `main`. **Auto-merge policy:** if the verify bar is green,
   squash-merge it yourself. If red, fix and re-verify; do not merge red.
7. Do the task's **Final step**: append one dated line to the "Session log" at
   the bottom of `docs/STATUS.md` (append only — on a conflict keep both lines).
8. Loop back to step 1.

## If stuck (after 3 attempts at the same error)

Append a short "BLOCKED" line to `docs/STATUS.md` Session log (task, what you
tried, exact error, best guess), then move on to the next unblocked task — never
idle.

## Guardrails specific to this repo

- There is **no `typecheck` and no `lint`** here (plain JS). The real bar is
  `npm test` + `node scripts/qa-check.mjs` + a browser screenshot. `npm run
  build` is a no-op by design.
- A `pre-push` hook (`.githooks/pre-push`) blocks history-erasing pushes — good,
  leave it.
- Anything needing an account or a secret (Vercel env vars, Twilio/SendGrid/
  QuickBooks/Anthropic/NVIDIA keys, changing PINs, the real business phone
  number) is **not** in this loop — it is in `docs/OWNER-MANUAL-STEPS.md`.
- Convention this loop mirrors: `docs/issues/*.md` (each a complete memory-less
  task) + the wave system in `docs/issues/README.md`.
