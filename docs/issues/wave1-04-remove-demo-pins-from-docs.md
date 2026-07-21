TITLE: Wave 1: Remove published demo PINs from the deployment checklist
LABEL: jules
BRANCH: docs/remove-demo-pins
FILES: docs/DEPLOYMENT_CHECKLIST.md

---

REPO
Repository: github.com/ejnburrows-rgb/otto
Owner: ejnburrows-rgb (EJN — ejnburrows@gmail.com)
Branch: main
Every commit you make must show EJN as the author.

## Before you start

Read `AGENTS.md` in the repository root **in full** and obey it. It is the single
source of truth for how work is done here. Note its SAFETY RULES: this project is a
CRM holding real client data.

Create a new branch off `main` named `docs/remove-demo-pins` and do all your work
there. Do not work directly on `main`. Do not force-push, ever.

## Background (plain language)

`docs/DEPLOYMENT_CHECKLIST.md` contains a table headed "Demo PINs (testing)" listing
Owner PIN `0721` and Field PIN `0715`. The same document tells the crew to sign in
with their assigned PIN, so these read as real, working sign-in codes for a system
holding customer data.

Writing live sign-in codes into project documentation is unsafe. Remove them.

Be honest about the limits of this change: these PINs are already in the project's
git history, so deleting them from the current file does not erase them from the
past. Say so in your write-up, and make sure the replacement text tells the owner
that the codes themselves still need to be changed in the app.

## Exactly what to change

In `docs/DEPLOYMENT_CHECKLIST.md`:

1. Delete the "Demo PINs (testing)" table and the specific PIN values.
2. Replace that section with a short plain-language note saying that each crew
   member is assigned their own PIN in the app under Team, that PINs are never
   written down in this repository, and that the previously published demo codes
   must be changed in the app because they appear in the project's history.
3. In the existing "Pre-crew security (when going live with real data)" checklist,
   leave the items as they are — they already say to replace demo PINs with unique
   ones. Do not tick any box; none of them are done.

Do not touch any other file. Do not change any code.

## This task is done when

- The strings `0721` and `0715` no longer appear in `docs/DEPLOYMENT_CHECKLIST.md`.
- The file still explains clearly how a crew member gets their sign-in code.
- The file states plainly that the old codes remain in git history and must be
  changed in the app.

## Proof required

In your pull request include:

- The output of a search for `0721` and `0715` across the repository, showing they
  no longer appear in `docs/DEPLOYMENT_CHECKLIST.md` (they will still appear in git
  history — that is expected and worth noting).
- The before-and-after text of the section you replaced.

## Final step (required)

Append one line to the "Session log" section at the bottom of `docs/STATUS.md`
describing what you did, dated 2026-07-21 or later. Append to the end of that list;
do not edit anyone else's line. If git reports a conflict in that section, keep both
lines.
