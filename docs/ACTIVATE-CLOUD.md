# Switching on the cloud database — a ten-minute job

This is the click-by-click for issue #28. Plain language, no jargon left
undefined. Everything here needs your Supabase dashboard and your Vercel
account, which is why an agent cannot do it for you.

> **Read this first — most of it is already done.**
> I checked the live site on **2026-07-29** and the cloud is **already switched
> on**. `https://otto-kohl.vercel.app/api/data` answers `200` with real data
> instead of `503`, so the two Vercel settings in step 3 are already in place.
> Steps 1–4 are kept as the record of what was done and what to redo if it ever
> breaks. **What still needs you is [step 6](#6-the-one-thing-that-is-actually-wrong).**

---

## What "switching on the cloud" means

The app works on each phone on its own, storing everything on the device. The
cloud database is what lets two phones see the same customer list. Without it
the app still runs — it just cannot share.

Two settings connect the two. Both live in Vercel (the service that hosts the
site). Neither ever belongs in the code.

| Setting name | What it is | Where you get it |
|---|---|---|
| `SUPABASE_URL` | the address of your database | Supabase → Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | the **secret** key that can read and write everything | Supabase → Settings → API → `service_role` |

The second one is a master key. Anyone holding it can read every customer
record. It belongs in Vercel and in a local `.env` file and **nowhere else** —
never in a message, never in a document, never in this repository.

---

## 1. Create the tables

1. Open your Supabase project → **SQL Editor** → **New query**.
2. Open `supabase/migrations/0001_init_schema.sql` from this repository, copy
   all of it, paste it in, press **Run**.
3. It creates 43 tables and locks every one of them so the public cannot read
   them. It is safe to run twice — every statement says `if not exists`.

I cross-checked this file on 2026-07-29 against every collection the app
actually reads and writes. **Nothing is missing.** All three lists agree
exactly — the 42 collections in `index.html` plus `companyProfile`, the 43 in
`api/data.js`, and the 43 tables the migration creates.

## 2. Create the photo storage bucket

This one cannot be done in SQL — Supabase does not allow creating a storage
bucket from a query, so it has to be a click.

1. Supabase → **Storage** → **New bucket**.
2. Name it exactly `job-photos`.
3. Leave **Public** switched **OFF**. This matters: on means anyone with the
   file address can view your customers' photos.
4. Then SQL Editor → **New query** → paste
   `supabase/migrations/0002_photo_storage.sql` → **Run**. That adds a rule
   explicitly denying the public, on top of the bucket being private.

## 3. Put the two settings into Vercel

1. Vercel → your **otto** project → **Settings** → **Environment Variables**.
2. Add `SUPABASE_URL`, value = your Project URL from the table above.
3. Add `SUPABASE_SERVICE_ROLE_KEY`, value = the `service_role` secret.
4. Apply both to **Production**, **Preview** and **Development**.

## 4. Redeploy

Settings only take effect on a new deployment. Vercel → **Deployments** → the
top one → **⋯** → **Redeploy**.

## 5. Load the rescued data — only if the tables are empty

The seed file is **`backups/seed_data.sql`**.

> **It is deliberately not in this repository, and it must stay that way.** It
> holds real customer names, addresses and phone numbers, and real employee
> records. This repository is where a credential was published once already
> (see STATUS §3.1); customer data must not follow it. Keep the file on your own
> machine or in your password manager, load it through the Supabase SQL editor,
> and do not commit it.

If the counts in step 7 already match, the data is loaded and you can skip this.

## 6. The one thing that is actually wrong

Running the check below on 2026-07-29 turned up a genuine problem:

```
PASS  customers: 3
FAIL  jobs: expected 3, found 8
PASS  invoices: 1
PASS  users: 19
PASS  audit_log: 48
```

Four of the five match. Jobs does not, and the reason is not a miscount. Looking
at what is actually in the table:

| Job | Created | What it is |
|---|---|---|
| Kitchen faucet leak | 2026-07-17 | real, rescued from the old database |
| Water heater install | 2026-07-17 | real |
| Sewer line inspection | 2026-07-17 | real |
| Kitchen faucet leak | 2026-07-28 | **duplicate of the first one** |
| Water heater install | 2026-07-28 | **duplicate** |
| Sewer line inspection | 2026-07-28 | **duplicate** |
| Toilet flange repair | 2026-07-28 | **demo data** from the KPI seeding |
| Garbage disposal replacement | 2026-07-28 | **demo data** |

**What appears to have happened.** When the app starts on a device with no data,
it creates three starter jobs and — since the KPI work — two demo jobs so the
charts are not empty. Those records get brand-new internal ids each time, so
when that device syncs, the cloud sees five records it has never met and stores
them alongside the originals. It cannot tell they are the same jobs.

**Why it matters.** This is not a one-off. It looks like it will happen again
every time someone opens the app on a fresh phone or after clearing their
browser data — and there are 19 people on the roster. The live jobs list grows a
little more wrong each time, and demo jobs sit in it looking like real work.

**I have not deleted anything.** Deleting data needs your say-so, and I will not
touch a live customer database on my own judgement. Two things need deciding,
and they are separate:

1. **The five extra rows** — do you want them removed? They are identifiable by
   their 2026-07-28 creation date.
2. **The cause** — the seeding should not reach the cloud at all. The fix is
   probably to give the starter and demo records fixed ids instead of fresh ones
   each time, so a second device recognises them as the same records rather than
   new ones, or to stop seeding entirely once the cloud is connected. Tell me
   which way you want it and I will build it.

## 7. Check it worked

```
node scripts/verify-supabase.mjs
```

Add the public key to make the privacy check stronger — this is the **public**
`anon` key, not the secret one:

```
SUPABASE_ANON_KEY=<the anon key> node scripts/verify-supabase.mjs
```

It proves three things and refuses to pass on any of them:

1. **A member of the public cannot read your customers.** A `200` here is the
   exact fault that made the old Firebase database a breach, and the script says
   so in those words. A `404` is **not** treated as a pass either — that only
   means the tables are missing.
2. **The live site can reach the database** — `/api/data` answers, and
   specifically is not `503`, which is what it returns when the two settings are
   absent.
3. **The record counts match** what was rescued: 3 customers, 3 jobs, 1 invoice,
   19 users, 48 audit-log entries.

It exits with an error code if anything fails, so it is safe to rely on.

---

## Current state of issue #28

| Proof required | Status on 2026-07-29 |
|---|---|
| Anonymous request refused, not 200 and not 404 | **passing** — HTTP 401 |
| `/api/data` not returning 503 | **passing** — HTTP 200 |
| Counts match 3 / 3 / 1 / 19 / 48 | **failing on jobs** — see step 6 |
| Backups screen shows Cloud ✅ | not checked — needs a signed-in browser session on the live site, which needs a real sign-in code |

Three of the four are now independently proven rather than reported. #28 should
stay open until the jobs count is resolved.
