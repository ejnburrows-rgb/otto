TITLE: Wave 2: Stop cloud sync from silently erasing a colleague's work
LABEL: wave-2
BRANCH: fix/conflict-safe-cloud-sync
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
holding real client data, and every database operation is high-risk.

Create a new branch off `main` named `fix/conflict-safe-cloud-sync` and do all your
work there. Do not work directly on `main`. Do not force-push, ever.

**Do not test against the live Firestore database.** Use your own test Firebase
project, or a local stub. Never point your test runs at project `otto-crm-7f951`.

## Background (plain language)

The app keeps its data on each device and can also sync to Firebase Firestore
(Google's cloud database) so a crew of about 19 people can share records.

The sync works like this: `cloudPush()` sends a whole collection (for example every
customer) up to the cloud, overwriting whatever is there. `cloudPull()` downloads and
replaces the local copy. There is no merging and no check for whether someone else
changed something first.

The consequence: if two people have the app open and both make a change, whoever
saves second overwrites the first person's work, silently and with no warning. For a
19-person team this will lose real customer and job records.

## Exactly what to change

Work in `index.html`, in the cloud sync section (search for `function cloudPush` and
`async function cloudPull`, near line 984).

Implement per-record merging instead of whole-collection overwrites:

1. **Give every record a last-modified timestamp.** The `add()` and `save()` helpers
   already set `created`; add and maintain an `updated` timestamp (ISO 8601 format)
   whenever a record changes.
2. **Merge on pull rather than replace.** When pulling, compare each incoming record
   with the local one by `id`. Keep whichever has the newer `updated` timestamp.
   Records that exist on only one side are kept.
3. **Push only what changed.** Track which records were modified locally since the
   last successful sync and send only those, rather than the whole collection.
4. **Handle deletes safely.** A deleted record must not silently reappear from
   another device. Use a "soft delete" (mark the record `deleted: true` with a
   timestamp) rather than removing it outright, and hide soft-deleted records from
   the interface.
5. **Never lose data on conflict.** If two versions of the same record have the same
   timestamp but different contents, keep the local copy and log a warning to the
   console rather than discarding either silently.

Keep the change as small as it can be while achieving the above — `AGENTS.md` asks
for the simplest solution that works, and forbids rewriting whole files when a
targeted edit will do. Do not touch any other file.

## This task is done when

You can demonstrate, using a **test** Firebase project, that:

- Two browser windows, both signed in, each editing a *different* customer, end up
  with both edits present after syncing. Neither is lost.
- Two windows editing the *same* customer end with the later edit winning, and no
  error or blank record.
- Deleting a customer in one window does not cause it to reappear from the other.
- A device that has been offline and then reconnects keeps its offline changes and
  merges rather than being wiped by the cloud copy.
- The app still works completely with cloud sync switched off.

## Proof required

In your pull request include:

- A short description of the test Firebase project you used (never the live one).
- Screenshots or a screen recording walking through each of the five scenarios above.
- Browser console output showing no errors during the runs.

## Final step (required)

Append one line to the "Session log" section at the bottom of `docs/STATUS.md`
describing what you did, dated 2026-07-21 or later. Append to the end of that list;
do not edit anyone else's line. If git reports a conflict in that section, keep both
lines.
