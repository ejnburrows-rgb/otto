TITLE: Wave 3: Stop storing and displaying sign-in PINs in plain text
LABEL: wave-3
BRANCH: fix/harden-sign-in
FILES: index.html

---

REPO
Repository: github.com/ejnburrows-rgb/otto
Owner: ejnburrows-rgb (EJN — ejnburrows@gmail.com)
Branch: main
Every commit you make must show EJN as the author.

## Before you start

Read `AGENTS.md` in the repository root **in full** and obey it. It is the single
source of truth for how work is done here. Note especially: this project is a CRM
holding real client data.

Create a new branch off `main` named `fix/harden-sign-in` and do all your work there.
Do not work directly on `main`. Do not force-push, ever.

**Run this task only after Wave 2's cloud sync work has been merged**, because both
tasks change `index.html` and would otherwise collide.

## Background (plain language)

Everyone signs in with a 4-digit PIN. Right now:

- PINs are stored as ordinary readable text on the device (`u.pin`).
- They are compared directly (`if (pin === selUser.pin)`).
- The Team screen shows every person's PIN in an editable box, so anyone who can
  open Team can read everyone's code.
- There is no limit on wrong attempts, so all 10,000 combinations can be tried.

Be clear-eyed about the ceiling here: this app runs entirely in the browser with no
login server, so none of this can be made truly secure against a determined attacker
with access to the device. The goal of this task is to remove the obvious weaknesses —
readable stored PINs, on-screen display, and unlimited guessing — not to claim the
result is bank-grade. Do not overstate the outcome in your write-up.

## Exactly what to change

Work in `index.html`.

1. **Stop storing PINs in readable form.** Store a hash instead (a hash is a one-way
   scrambled fingerprint — you can check whether a typed PIN matches, but cannot read
   the original back out). Use the browser's built-in `crypto.subtle` with SHA-256
   and a per-user random salt (a random value mixed in so two people with the same
   PIN do not get the same fingerprint). Store the salt alongside the hash.
2. **Migrate existing users automatically.** On first load after this change, convert
   any stored plain-text PIN to a salted hash, then remove the plain value. This must
   happen silently — nobody should be locked out or asked to re-enter anything.
3. **Stop showing PINs on screen.** In the Team screen, replace the PIN input's
   current value with a blank field labelled "Set a new PIN" (leave it empty to keep
   the current one). Never render an existing PIN into the page.
4. **Limit guessing.** After 5 wrong attempts for a given user, refuse further
   attempts for 60 seconds, with a plain-language message telling the person to wait.
   Keep the counter on the device.
5. **Keep the owner's second-step code (MFA) working**, applying the same hashing
   treatment to it.

Do not touch any other file. Do not change how the app looks beyond the Team screen
PIN field and the lockout message.

## This task is done when

- No readable PIN value is present anywhere in stored data. Verify by opening the
  browser's developer tools, inspecting IndexedDB and localStorage, and confirming
  you cannot find a 4-digit PIN in plain text. Paste what you see.
- An existing user created before this change can still sign in with their current
  PIN, with no action required from them.
- An owner can set a new PIN for someone in Team, and that person can then sign in
  with it.
- The Team screen never displays an existing PIN.
- Six wrong attempts in a row produce a wait message rather than a sixth check.
- The owner's second-step code still works.

## Proof required

In your pull request include:

- A screenshot of developer tools showing stored user data with no readable PIN.
- A screen recording or screenshots covering: an existing user signing in, an owner
  setting a new PIN, that person signing in with the new PIN, and the lockout message
  appearing after repeated wrong attempts.
- Browser console output showing no errors.

## Final step (required)

Append one line to the "Session log" section at the bottom of `docs/STATUS.md`
describing what you did, dated 2026-07-21 or later. Append to the end of that list;
do not edit anyone else's line. If git reports a conflict in that section, keep both
lines.
