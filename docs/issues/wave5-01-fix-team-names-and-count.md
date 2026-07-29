TITLE: Wave 5: Fix blank team names ("?") and the 15-vs-19 team count
LABEL: claude
BRANCH: fix/team-names-and-count
FILES: index.html

---

REPO
Repository: github.com/ejnburrows-rgb/otto
Owner: ejnburrows-rgb (EJN — ejnburrows@gmail.com)
Branch: main
Every commit you make must show EJN as the author.

## Before you start

Read `AGENTS.md` in full and obey it. Branch off `main` named
`fix/team-names-and-count`. Never force-push.

This task edits `index.html`. Do not start it while any other `index.html` task is
open. It should run AFTER Wave 4 is merged.

## Background (plain language)

Two related demo-data problems on the Team feature:

1. **Every field worker's avatar shows "?".** The seed data `blankDB()` (around
   lines 832–852) creates the 15 field workers with `name: ''` (empty). The
   avatar helper `initials()` (around line 1312) falls back to `'?'` when the name
   is empty, so all 15 show "?". Only the 4 non-field users have names.
2. **The count says 15 in one place and 19 in another.** The dashboard/hub tile
   (`viewHub`, around line 3902) counts only field workers
   (`role==='field'` → 15). The Team screen header (`viewTeam`, around line 2494)
   counts all users (`db.users.length` → 19). Same "Team" label, two different
   numbers.

## Exactly what to change

1. Give the 15 seeded field workers real placeholder display names in `blankDB()`
   (e.g. "Field Tech 1" … "Field Tech 15", or Spanish "Técnico 1" …) so avatars
   show initials instead of "?". Keep their `role`, `hourlyRate`, `lang` as-is.
2. Make the two counts agree on one meaning. Recommended: both show the field-crew
   size with a clear label — either relabel the Team-screen header count to match
   the hub's field-only count, or label each explicitly (e.g. hub tile "Crew: 15",
   Team header "19 people (15 crew)"). Pick one consistent presentation; do not
   leave two bare numbers under the identical word "Team".

Do not change auth, PIN, or any other seed collection. Touch only `index.html`.

## This task is done when

- The Team management screen shows named workers (real initials, no "?" avatars).
- The team count is consistent between the dashboard tile and the Team screen (no
  unexplained 15-vs-19 mismatch).
- `npm test` and `node scripts/qa-check.mjs` both pass.

## Proof required

- Terminal output of `npm test` and `node scripts/qa-check.mjs`.
- Browser screenshots of the dashboard tile and the Team screen showing named
  workers and matching/labelled counts.

## Final step (required)

Append one dated line to the "Session log" at the bottom of `docs/STATUS.md`.
Append only; on a conflict keep both lines.
