# Cloud sign-in setup (Supabase Auth) — owner steps

This turns on cloud sync, photo sync, in-app AI, customer notifications, and
QuickBooks sync. Until these steps are done, every one of those features stays
switched off on purpose (the server refuses every request), and the app keeps
working from each device only.

Estimated total time: about 20 minutes.

## What gets built here (plain language)

- Crew members get real accounts (work email + password) in Supabase Auth —
  the sign-in service that is part of the same Supabase project the database
  already lives in. No passwords are stored by the app itself.
- A small table called `user_roles` says which role each account has
  (owner / office / field). The server checks it on every request.
- The Vercel project gets one extra setting (`SUPABASE_ANON_KEY`) so the app
  can offer the sign-in form.

## Step 1 — create the role table (about 2 minutes)

1. Open the Supabase dashboard for the project, click **SQL Editor**, then
   **New query**.
2. Open `supabase/migrations/0002_user_roles.sql` from this repo, copy all of
   it, paste it in, click **Run**.

This creates the `user_roles` table, locked to the public exactly like every
other table.

## Step 2 — create the crew accounts (about 10 minutes)

Supabase dashboard → **Authentication** → **Users** → **Add user** →
**Create new user**, once per person who should sign in:

- Use each person's work email and a strong password you tell them privately
  (never in a chat, never in a document, never in this repo).
- Tick **Auto Confirm User** so no email confirmation is needed.

## Step 3 — give each account its role (about 5 minutes)

Still in **Authentication → Users**, click each user and copy their **User UID**
(a UUID like `3f2b…`). Then in **SQL Editor**, run one line per person:

```sql
insert into public."user_roles" (user_id, role, display_name) values
  ('PASTE-USER-UID-HERE', 'owner', 'Otto');
```

`role` must be exactly `owner`, `office`, or `field`:

- **owner** — everything, including QuickBooks sync and photo deletes.
- **office** — customers, money, notifications, photo deletes.
- **field** — their own jobs, photos, check-ins. No money, no payroll.

A person with no row here is refused by every protected route. That is the
intended default: no row, no access.

## Step 4 — add the anon key to Vercel (about 2 minutes)

1. Supabase dashboard → **Settings** → **API** → copy the **anon public** key
   (not the service_role one — the anon key is the public one every website
   uses; the database ignores it because every table is locked).
2. Vercel dashboard → the project → **Settings** → **Environment Variables** →
   add `SUPABASE_ANON_KEY` with that value, then **redeploy**.

## Step 5 — sign in on each device

On each crew phone: open the app → **Settings** → **Cloud sign-in** → enter
the work email and password once. The daily PIN still unlocks the app; the
cloud sign-in is what lets the server trust the phone.

## Proof it worked

- Settings → Cloud sign-in shows **Cloud signed in as** the work email.
- The Backups screen shows Cloud ✅.
- Signing in on a second phone shows the same jobs and photos as the first.
- An unsigned request still gets refused:

```
curl -i https://otto-kohl.vercel.app/api/data
# expected: HTTP/1.1 401 with {"error":"unauthenticated"}
```

## If something goes wrong

- **"Cloud sign-in is not configured on the server yet"** — Step 4 is missing
  or the redeploy has not happened.
- **Sign-in fails with a correct email and password** — the user was not
  created in Step 2, or **Auto Confirm User** was left unticked.
- **Sign-in works but everything still says no permission** — Step 3 is
  missing for that person, or the role spelling is wrong.
- Nothing here deletes or changes any existing customer data. The worst a
  mistake does is keep the features off, which is the state they are in today.
