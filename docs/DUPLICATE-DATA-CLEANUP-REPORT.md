# Duplicate demo data in the live database — evidence and cleanup criteria

**Status: information only. Nothing in this file deletes anything, and nothing
should be deleted until the owner has read this and said so in writing.**

This document exists because the live `jobs` table holds rows that were never
real work. It records how to tell them apart, what must happen before any
deletion, and what is still the owner's decision. The code fault that created
them is fixed separately — see the "Root cause" section.

---

## 1. What happened

A fresh device — a new phone, a reinstalled app, or a browser with its storage
cleared — used to create starter records for itself before it had spoken to the
cloud:

- `blankDB()` created **3 customers, 3 jobs and 1 call**
- `seedMockKPIs()` added **2 more jobs**, plus check-ins, a time-off request and
  two AI escalations

Every one of those records was given a **brand-new random id**. Cloud sync
matches records by id, so the server had no way to know they were the same
demo rows another device had already sent. It stored them as new records.

The result, measured against the live database:

| Date | Live `jobs` rows | What changed |
|---|---|---|
| 2026-07-17 | 3 | the three real jobs migrated from Firebase |
| 2026-07-28 | 8 | a fresh device came online (+5) |
| 2026-07-29 | 13 | another fresh device came online (+5) |

Five rows per fresh device. The roster has 19 people.

**Customers were not affected, by luck rather than design.** `cloudPush()` only
uploads a collection whose contents changed since the last push, and nothing
edits customers after start-up — so their seeded copies were never sent. A
single customer edit on a fresh device would have pushed three phantom
customers too.

---

## 2. Root cause (fixed in code)

Two things had to be true for this to happen, and both are now false:

1. **Seeding ran before the cloud pull.** Demo records existed locally before
   the device knew whether it was joining an existing company database. Boot
   now pulls the cloud first and only then considers demo data.
2. **Demo records were indistinguishable from real ones.** They now carry a
   `demo: true` stamp, and `cloudPush()` refuses to upload any record carrying
   it — so even a device deliberately switched into demo mode cannot
   contaminate a real workspace.

Demo data now only appears in explicit demo mode (`?demo=1`, remembered per
device). A production device starts empty and stays empty until real work is
entered or arrives from the cloud.

Regression coverage: `scripts/test-demo-seed.mjs` (37 checks).

---

## 3. How to identify the affected rows

Identification must rest on **immutable evidence** — values written when the
row was created and never edited since. Do not identify rows by their position
in a list, by row order, or by anything a person may have changed.

### Keep — real, migrated from Firebase

These three carry the original migration timestamp. **They must survive any
cleanup.**

| Job id | Title | `data->>'created'` |
|---|---|---|
| `mrp7ni9zz4s19` | Water heater install | `2026-07-17T17:27:21.671Z` |
| `mrp7ni9zkrgbz` | Kitchen faucet leak | `2026-07-17T17:27:21.671Z` |
| `mrp7ni9z6ejlj` | Sewer line inspection | `2026-07-17T17:27:21.671Z` |

### Candidates for removal — created by device seeding

| Job id | Title | `data->>'created'` |
|---|---|---|
| `ms5610razf13m` | Water heater install | `2026-07-28T21:26:11.734Z` |
| `ms5610razud2p` | Kitchen faucet leak | `2026-07-28T21:26:11.734Z` |
| `ms5610rasafja` | Sewer line inspection | `2026-07-28T21:26:11.734Z` |
| `ms56128ap03uf` | Garbage disposal replacement | `2026-07-28T21:26:13.642Z` |
| `ms56128aes3r7` | Toilet flange repair | `2026-07-28T21:26:13.642Z` |
| `ms6dxcgpxgp8u` | Sewer line inspection | `2026-07-29T17:55:03.385Z` |
| `ms6dxcgp0tfju` | Water heater install | `2026-07-29T17:55:03.385Z` |
| `ms6dxcgpy7z08` | Kitchen faucet leak | `2026-07-29T17:55:03.385Z` |
| `ms6dxe5998eaq` | Toilet flange repair | `2026-07-29T17:55:05.565Z` |
| `ms6dxe59tt2em` | Garbage disposal replacement | `2026-07-29T17:55:05.565Z` |

### The criteria, stated plainly

A job is a removal **candidate** only if **all** of the following hold:

1. Its `created` timestamp is **not** `2026-07-17T17:27:21.671Z`.
2. Its title is one of the five seeded titles: *Kitchen faucet leak*, *Water
   heater install*, *Sewer line inspection*, *Garbage disposal replacement*,
   *Toilet flange repair*.
3. It shares a `created` timestamp, to the millisecond, with other rows created
   in the same burst — seeding writes several records in one go, real work does
   not.
4. It has no evidence of human interaction: no check-in or check-out events by
   a real worker, no photos, no notes, no linked invoice, no status change
   after creation.

**Condition 4 is the one that matters most.** Titles repeat legitimately — a
plumbing company really does install more than one water heater. If any
candidate shows real activity against it, it is not a duplicate, and it must be
excluded and reported rather than removed.

### Rows this report does NOT cover

The same seeding also created `job_events`, `time_off`, `login_history` and
`ai_escalations` rows. They have not been individually identified here. Any
cleanup must decide what happens to records that point at a deleted job —
leaving them behind creates orphans that will confuse reports. **Do not delete
jobs without deciding this first.**

---

## 4. Required before any deletion

Every one of these, in order, with no steps skipped:

1. **Take a full export and confirm it is readable.** Settings → "Backup all
   (JSON)". Open the file and confirm the three real jobs are present. A
   restore from this file has been rehearsed and works (STATUS.md §4 item 5).
2. **Store the export somewhere other than the device that made it.** Snapshots
   otherwise live in the same browser storage as the data they protect.
3. **Take a Supabase-side backup** of the `jobs` table and any related table a
   cleanup would touch.
4. **Produce a dry-run list first** — every candidate id, title, created
   timestamp, and the evidence for condition 4 — and have the owner read it.
5. **Confirm the count arithmetic.** 13 rows − 10 candidates = 3 remaining. If
   the arithmetic does not come out at exactly 3, stop.
6. **Get the owner's explicit written approval**, naming the count to be
   removed.
7. Only then may anything be removed, and only the approved ids.

---

## 5. Owner decisions

Nothing below has been decided. Each needs an answer before cleanup.

- [ ] **Remove the ten candidate rows at all?** They are harmless to the
      database but they appear in job lists and reports as though they were
      real work. Leaving them is a legitimate choice; so is removing them.
- [ ] **What happens to related records** — the `job_events`, `time_off`,
      `login_history` and `ai_escalations` rows created by the same seeding?
      Delete alongside, or leave?
- [ ] **Who performs it, and in what environment?** This touches a live
      customer database.
- [ ] **Should the three real jobs be re-verified against the original Firebase
      export first**, as an independent check that they are the true originals?

---

## 6. Deliberately not included

This file contains **no delete statements, no scripts, and no commands**. That
is intentional. A copy-pasteable delete against a live customer database is a
hazard sitting in a repository, and the fault this document describes was
itself caused by code doing something to production data that nobody had asked
for.

When the owner has approved a cleanup, the deletion should be written at that
point, reviewed against the approved id list, and run once with the backups
from section 4 confirmed in hand.
