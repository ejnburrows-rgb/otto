# Scrub report — what I would do next, in priority order

Written 2026-07-29 at the end of a session that merged the pull-request backlog,
did the accessibility work, and built the Supabase activation kit.

Nothing here is a new feature. Every item is either a fault I found and did not
fix, a decision that is yours to make, or a claim in the documentation that
turned out not to be true. Items are ordered by what goes wrong if they are left
alone, not by effort.

Where I say something is broken I have said how I know. Where I am unsure I have
said that instead.

---

## 1. Seeded demo data is writing itself into the live customer database

**Found by** `scripts/verify-supabase.mjs` on its first run. Reported in full in
`docs/ACTIVATE-CLOUD.md` §6 and PR #66.

The live `jobs` table holds **8 rows where 3 are expected**. The three real jobs
(created 2026-07-17) are intact. The five extras were all created 2026-07-28 and
are duplicates of those same three plus the two demo jobs the KPI seeding adds.

The cause looks structural: when the app starts on a device with no data it
creates starter and demo records with **freshly generated ids**, so the cloud
receives them as records it has never seen and stores them alongside the
originals. That means it repeats on every fresh device or cleared browser, and
there are 19 people on the roster.

**Why this is first:** it is the only item actively corrupting real data, and it
gets worse with time rather than staying still.

**Two decisions, both yours** — I did not act because deleting data and changing
seeding behaviour are both on your stop-and-ask list:

1. Remove the five extra rows? They are identifiable by creation date.
2. Fix the cause by giving seeded records fixed ids so a second device
   recognises them, or by not seeding at all once the cloud is connected.

## 2. CI has never run — the repository is not actually protected

**Found by** the GitHub Actions API. Recorded in `docs/STATUS.md` §1a and PR #65.

`.github/workflows/ci.yml` has run **once ever**: 2026-07-21, started by hand,
ending in `startup_failure` before reaching a step. Zero runs since — not on any
of the nine pull requests, not on any push to `main`, including six merges on
2026-07-29.

The workflow file is not the problem; it parses and its triggers are correct.
Actions is simply not executing for this repository. The likely causes are
Actions switched off in settings, or a private-repo minutes limit — both only
visible from your account.

This is §3.7 repeating in a quieter form. A workflow that fails leaves a red
cross; a workflow that never starts leaves nothing at all, which is why it went
unnoticed for a week. Every "tests pass" claim on this repo, mine included,
rests on a local run.

**Needs you:** Settings → Actions → confirm enabled and in credit, then re-run
from the Actions tab.

## 3. The landing page language toggle cannot be clicked

**Found by** driving the real page. Reported in PR #56.

The markup fix in #56 is real — `.lang-toggle button` goes from matching **0**
elements on `main` to **2** on that branch. But the buttons still cannot be
reached: `.sidebar` is `width: 140px` with `padding: 0 70px` and
`box-sizing: border-box`, so its content box is exactly **0px** wide. The toggle
inside it computes to zero width with `overflow: hidden`, clipping both buttons.
A real click times out with the sidebar intercepting the pointer.

The translation engine underneath **works** — calling `setLang('es')` directly
turns the hero into "Los Mejores de Miami: Plomeros de Confianza" and sets
`<html lang="es">`. Only the control is unreachable. On mobile the sidebar is
`display: none`, so there is no toggle at all.

This is pre-existing on `main`, not caused by #56.

**I did not fix it** because it changes the layout of your public marketing page,
which is a design decision. Options are in PR #56.

## 4. Two things in `api/photos.js` and `api/data.js` are open to anyone

**Found by** reading the diff while reviewing #60, where I flagged it before
merging.

Neither endpoint authenticates its caller. Anyone who can reach
`/api/photos?fileId=<id>` gets a one-hour signed URL for that photo; POST and
DELETE are open the same way. `/api/data` is the same shape.

This is **not** a regression from #60 — that PR followed the pattern `api/data.js`
already set, which is why I merged it. But it means the private photo bucket is
only as private as a file id is hard to guess, and the customer database is
reachable by anyone who knows the URL.

**Why it is not higher:** I have no evidence it has been exploited, and the
sign-in situation in §3.2 already means the app is not bank-grade. But it
undercuts the point of having moved the keys server-side, and it should be
decided deliberately rather than inherited by accident.

**Needs a decision from you** because it spans three endpoints and interacts with
how sign-in works.

## 5. The charts on the KPIs screen have never been seen working

Reported in PR #55.

The data behind them is now proven real and deterministic — I derived the four
series twice in one session and got identical results, totals 5/2/2/1. But the
charts themselves paint via Chart.js loaded from a CDN, and `renderCharts` guards
on `if (!window.Chart)`, so in any environment without that CDN the panel shows
the placeholder instead. I have proven the numbers and **not** the rendering.

Two follow-ons, neither of which I would decide alone:

- Somebody should open the KPIs screen on the live site and confirm the charts
  actually draw.
- An offline-first app with a service worker depending on a CDN for a whole
  screen is a contradiction worth resolving — either vendor Chart.js into the
  repo or accept that the charts are online-only and say so.

## 6. The test suite's summary lines are inconsistent, and it cost accuracy

`scripts/test-notify.mjs` ends with `Tests complete. Passed: N, Failed: 0` while
the other seven scripts end with `N passed, 0 failed`. Reading the totals with a
pattern silently drops it and mislabels the quickbooks line as notify's.

I got this wrong five times in a row during the backlog merge, under-reporting
the count in five pull-request comments and five squash-merge messages before
noticing. Corrections are posted on each. The real total is **165**.

Making the eight scripts print one consistent line is a small change that removes
the trap. I did not do it because it belongs in its own commit rather than inside
someone else's PR.

## 7. `docs/AGENT-LOOP.md` contradicts `AGENTS.md`, and its task list is stale

Raised in PR #52, where I stripped the Firebase references but left the rest.

- Its "WHO RUNS THIS" section splits behaviour by named tool and tells you to
  grant a specific agent push access. `AGENTS.md`, as merged in #61, now says no
  lane is reserved for a particular tool and not to write handoff prompts for
  one. The two documents disagree.
- Tasks T1 to T6 all describe work that is now on `main` — the inbox button, the
  KPI mock data, the unnamed field techs, the nav casing, the booking form, the
  placeholder phone. An agent picking it up today would redo six finished jobs.

**Needs you** to decide whether that document is still the process you want
before anyone edits it further.

## 8. Smaller things I noticed and left alone

- **`docs/A11Y_AUDIT.md` was stale in a way that mattered.** It ended saying the
  findings "have not yet been fixed" when nearly all had been, on 2026-07-21.
  Anyone trusting it would have redone finished work — which is close to what I
  was asked to do. Corrected in PR #65.
- **`.pill.blue` fails contrast in light theme only** (4.44:1). Fixed in #65, but
  it is a reminder that the light theme gets far less testing than the dark one;
  my audit is the first thing that has measured it.
- **The KPI lookup maps in #49 are plain `{}` objects** keyed by worker id. Not
  exploitable — ids are generated internally — but `Object.create(null)` would
  close it, and we merged a prototype-pollution fix the same day.
- **`BOOKING_EMAIL` in `landing.html:1190`** is still the placeholder
  `dispatch@ottoplumbing.com`, marked `TODO(owner)`. Until it is a real inbox,
  submitted booking forms go nowhere.
- **`scripts/qa-browser.mjs` is not run by `npm test` or `npm run qa`.** It is
  the only thing that drives the whole app in a browser, and nothing invokes it.
- **`0721` and `0715` remain in five documentation files** by choice — they are
  historical records of the leak. The codes themselves still need changing in the
  app; that is STATUS §3.3 and still outstanding.

---

## Deliberately not on this list

Anything that would be a new feature. Also anything touching money, deadlines,
client communication, image dimensions, or deleting data — those are yours to
decide, and where I hit one I stopped and said so rather than guessing.
