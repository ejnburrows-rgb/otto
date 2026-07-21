# Conflict-safe cloud sync — design

Date: 2026-07-21
Tracks: [issue #22](https://github.com/ejnburrows-rgb/otto/issues/22)
Status: approved, not yet implemented

## The problem

Cloud sync can silently destroy a colleague's work.

`cloudPush()` sends a whole collection at a time and `cloudPull()` replaces the
local copy of that collection wholesale. Neither compares individual records. So
if the office adds a customer while a plumber is also adding one, whichever
device saves second overwrites the first — even though the two people touched
completely different records. Nobody is warned, and the lost record simply is
not there any more.

For a crew of about 19 people this will lose real customer and job records. It is
the largest remaining data-integrity risk in the project.

## What we are building

Per-record merging instead of whole-collection replacement, plus a periodic
download so people see each other's work without restarting the app.

### Decisions made, and why

| Decision | Choice | Reason |
|---|---|---|
| Conflict granularity | Whole record | The owner confirmed people almost always edit *different* records. Field-level merging would add real complexity for a case that rarely happens. |
| Conflict winner | Most recently edited | Simple, predictable, explainable to a non-technical owner. Correct in nearly every real clash. |
| Deletes | Soft delete (`deleted: true`) | An accidental delete stays recoverable, invoice history stays intact for accounting, and a deleted record cannot be resurrected by a phone that was offline when it happened. |
| Clock source | The server | Device clocks are wrong often enough to matter. A phone set fast would win every conflict; a slow one would lose every time and its owner's work would quietly vanish. One shared clock beats 19 unreliable ones. |
| Update frequency | Poll roughly every 20 seconds while the app is open and visible | See "Why not true realtime" below. |

### Why not true realtime

The owner initially asked for near-instant, live updates. That conflicts with the
security architecture adopted earlier the same day.

Live updates require each phone to hold an open connection directly to Supabase,
which means the browser must carry a database key. Removing exactly that kind of
key from the browser is what closed the Firebase data breach (see
`docs/DECISIONS.md`, 2026-07-21). Reintroducing one would partly undo that work.

Three options were considered:

- **A — frequent polling through our own server.** Key stays server-side. Changes
  land within ~20 seconds. Small change to existing code. **Chosen.**
- **B — browser connects directly to Supabase.** ~1 second updates, but the
  browser holds a key again, correctness depends permanently on database rules
  being exactly right, and a persistent connection drains battery and drops
  constantly in basements and crawlspaces.
- **C — live through our own server.** Keeps the key server-side *and* is
  instant, but Vercel's functions are short-lived and cannot hold connections
  open for 19 phones. Needs different hosting and ongoing cost.

B is not inherently unsafe — it is how most applications work. It was rejected
*for now* specifically because sign-in is still 4-digit PINs stored in plain text
([issue #23](https://github.com/ejnburrows-rgb/otto/issues/23)), so "restrict
access by who is signed in" does not yet mean much in this app. **Once #23 is
fixed, B becomes a reasonable choice and this decision should be revisited.**

## How it works

### Record shape

Every record gains two fields:

- `updated` — timestamp of the last change, written by the server, not the device
- `deleted` — `true` when the record has been deleted; absent or `false` otherwise

Every screen, list, count, report, and export must exclude records where
`deleted` is `true`. A soft-deleted record must be indistinguishable from a
removed one to anyone using the app — otherwise deletes appear not to work. The
only thing that changes is that the data is still recoverable underneath.

The existing 93 migrated records have no `updated` value. They are backfilled
from the `created` date each record already carries. The first sync therefore
treats them all as old, which is correct — nobody has edited them since the
migration.

The Supabase tables already have an `updated_at` column
(`supabase/migrations/0001_init_schema.sql`), so the server has somewhere to
stamp the time without a schema change.

### Sending up

The app tracks which records actually changed and sends only those, instead of
whole collections. Sends stay batched behind the existing 1.5-second delay so
typing does not fire one request per keystroke.

### Coming down

Roughly every 20 seconds, while the app is open and on screen, the app asks for
records changed since its last check. Each incoming record is merged against the
local one by `id`:

- Newer `updated` wins.
- A record present on only one side is kept, never dropped.
- Same timestamp but different contents: keep the local copy and log a warning.
  Never discard either silently.

Polling stops when the app is backgrounded or the phone sleeps, so it does not
drain battery in a van all day.

### Offline

Unchanged from today: the app runs fully from the device. Changes made with no
signal queue and go out when the connection returns, merging normally rather
than overwriting.

### Failure handling

A collection the server cannot return keeps the device's copy rather than being
blanked. This was fixed on 2026-07-21 after the same fault was found and
reproduced; the behaviour must be preserved and covered by a test. A failed poll
is a no-op and the next one retries.

## Files this touches

- `index.html` — the cloud sync block (search `function cloudPush`), and the
  `add()` / `save()` record helpers which must maintain `updated`
- `api/data.js` — must stamp server time on write and support fetching only
  records changed since a given time

Note `api/data.js` keeps its own copy of the collection list. Adding a collection
in one file and not the other means it silently never syncs.

## Testing

Written test-first. Sync bugs lose data silently and surface weeks later, so each
test is written before its fix to prove the bug is real and that the fix
addressed it.

The merge logic is tested directly as a function with fake inputs — no database
or browser needed, so it runs in seconds and can cover timing that is impractical
to stage by hand. End-to-end checks run against a **separate test Supabase
project, never `otto-live`.**

Must pass:

1. Two devices edit different customers → both edits survive.
2. Two devices edit the same customer → later edit wins, no error, no
   half-written record.
3. Delete on one device → stays deleted, does not reappear from the other.
4. Device goes offline, makes changes, reconnects → its changes merge rather than
   being wiped by the cloud copy.
5. Cloud sync switched off entirely → the app still works fully from the device.
6. One collection fails to load while others succeed → that collection keeps its
   local copy.
7. A record genuinely emptied → actually empties, so the safety net in 6 does not
   freeze stale data in place.

## What this does not cover

- **Photos.** Images live only on the device that took them and are not synced.
  Tracked separately as [issue #30](https://github.com/ejnburrows-rgb/otto/issues/30).
- **Who is allowed to edit what.** Any signed-in user can change any record.
  Meaningful access control depends on real sign-in ([#23](https://github.com/ejnburrows-rgb/otto/issues/23)).
- **Proof at real-world scale.** These tests prove the merge rules are correct.
  They cannot prove 19 phones on Miami cell service behave well. Expect a week of
  real crew use before calling this done.

## Prerequisite

Blocked until `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in Vercel.
Until then `/api/data` returns 503 and there is nothing to sync against.
