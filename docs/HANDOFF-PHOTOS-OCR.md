# Handoff — photo sync, OCR, and silent failures

Written 2026-07-31 for whichever tool picks this up next. Findings were traced against
`main` at commit `35e0e97`; confirm them rather than re-deriving from scratch, then fix
what needs fixing.

## Context

OTTO Plumbing CRM (`ejnburrows-rgb/otto`) is live at https://otto-kohl.vercel.app and is
about to be demoed to a client and then used for real work. Three things need
investigating before that happens: whether failures are actually visible to the user,
whether OCR works, and whether a photo taken on a crew phone reaches the owner and the
office manager.

I traced all three in the current `main` (commit `35e0e97`). The findings below are
verified against the code, not assumed — the next agent should confirm them rather than
re-derive them from scratch, then fix what needs fixing.

**The single most important thing to understand first:** `api/_lib/serverAuth.js` exports
`hasServerAuth()` which returns `false` unconditionally. Every sensitive server route
(`api/data.js`, `api/photos.js`, `api/claude.js`, `api/nvidia.js`, `api/notify.js`, and the
QuickBooks `sync` action) refuses every request with `403 server_auth_not_configured`
before touching any upstream service. This is deliberate containment from a July security
review, documented in `docs/STATUS.md` §3.8. Two of the three tasks below are blocked by
it. **Do not "fix" it by making `hasServerAuth()` return true** — that reopens the hole it
was built to close.

---

## The handoff prompt (paste this)

> You are working on OTTO Plumbing CRM, a single-file offline-first PWA. The whole app is
> `index.html` (~5,200 lines, no build step); serverless functions live in `api/`. Read
> `AGENTS.md` first and follow it — especially: never commit to `main` (branch and open a
> PR), commit as `EJN <ejnburrows@gmail.com>`, never put an AI or tool name in commit
> messages or PR text, and never claim something works without running it and showing
> proof.
>
> Run `npm test` (307 checks) and `node scripts/qa-check.mjs` before and after your
> changes. `npm start` serves the app on http://localhost:8000. Demo data is seeded with
> `?demo=1`.
>
> Critical constraint: `api/_lib/serverAuth.js` `hasServerAuth()` returns `false`
> unconditionally, so all six sensitive server routes return `403
> server_auth_not_configured`. That is intentional containment (`docs/STATUS.md` §3.8),
> not a bug. Do not disable it. Tasks 2 and 3 are blocked behind it — your job is to make
> the *failure* honest and the code *correct for when the gate opens*, not to open the
> gate.
>
> ### Task 1 — Failures are currently silent. Make them visible.
>
> Find every place where a real failure is swallowed and the user is left believing the
> action succeeded. Confirmed instances to start from:
>
> - **`_drainPhotoQueue()` / `_bumpPhotoRetry()`** (`index.html` ~line 1141–1180). On a
>   failed upload it retries every 30 seconds, and after 20 attempts (~10 minutes) it
>   deletes the queue entry and gives up **with no message of any kind**. The photo still
>   displays locally forever, so the crew member believes it is filed. Right now every
>   upload hits `403` and dies this way. This is the worst one.
> - **`getFileURL(id)`** (~line 1111). On a second device the blob is not local, so it
>   fetches `/api/photos`; any failure returns `null` and the image is simply absent from
>   the grid — no broken-image state, no "photo not available on this device", nothing.
> - **`deletePhotoFile(fileId)`** (~line 1194) fires a `DELETE` at `/api/photos` and
>   ignores the result entirely.
> - **`cloudPush()`** (~line 1319) logs push errors to `console.warn` only.
>
> Decide with the owner's interests in mind what "visible" should mean — a per-photo
> pending/failed badge, a count somewhere persistent, a banner. The Backups screen
> (`viewBackups`, ~line 4400) already surfaces cloud status and is the existing pattern for
> this; prefer extending it over inventing a second mechanism. Do not add noisy toasts that
> fire every 30 seconds.
>
> Add regression tests. `scripts/test-photos.mjs` already exists and is the right home.
>
> ### Task 2 — OCR: confirm it works, and that it fails honestly when it cannot.
>
> The chain is: `quickPhoto`/`uploadDoc` → `ocrDocument` / `ocrCheck` /
> `ocrCustomerAccount` (~line 3046–3050) → `aiVision(dataUrl, prompt)` (~line 3038) →
> `callClaude(body)` (~line 3012).
>
> `callClaude` has **two** paths, and this matters:
> 1. `POST /api/claude` — currently always `403` because of the gate.
> 2. **Fallback:** a personal Anthropic key from `localStorage.otto_ai_key`, entered in
>    Settings ("Anthropic API Key (optional, this device)"), calling `api.anthropic.com`
>    directly from the browser with `anthropic-dangerous-direct-browser-access: true`.
>
> So **OCR can actually work today** if a key is pasted into Settings, unlike the NVIDIA
> PDF-takeoff path (`callNvidia`, ~line 3030), which is server-only with no fallback and
> therefore genuinely dead until the gate opens.
>
> What to verify:
> - Does OCR actually produce correct output with a real key? Test `ocrCheck` against a
>   photo of a check and `ocrDocument` against an invoice. `aiVision` expects the model to
>   return JSON and does `txt.match(/\{[\s\S]*\}/)` then `JSON.parse` — check what happens
>   when the model returns prose, a code fence, or two JSON objects. A parse failure
>   currently returns `null` and is indistinguishable from "no key".
> - The model id is hardcoded as `claude-sonnet-4-6` in several call sites. Confirm that is
>   a valid current model id and that vision requests succeed with it; if not, correct it
>   everywhere.
> - `aiVision` shows `toast(t('noKey'))` for *every* failure — no key, network down, bad
>   key, unparseable reply all look identical to the user. Distinguish them.
> - Consider whether the browser-key fallback should stay at all. It puts a paid API key in
>   the browser, which is the same class of mistake as the Firebase key in
>   `docs/STATUS.md` §3.1 — though note this one is in `localStorage`, is **not** synced to
>   Supabase, and is opt-in per device. Raise the tradeoff with the owner rather than
>   deciding unilaterally; it is currently the only way any AI feature works.
>
> ### Task 3 — A photo taken on a crew phone must appear for the owner and the office manager.
>
> This does **not** work today, and it is blocked in two independent places:
>
> 1. **The photo record.** `db.photos` is in `COLLECTIONS` (~line 831) and therefore in
>    `SYNCED_COLLECTIONS`, so `cloudPush()` sends it to `/api/data` → `403`. The record
>    never leaves the device.
> 2. **The image bytes.** `storeFile()` (~line 1110) writes the blob to IndexedDB and
>    enqueues it; `_drainPhotoQueue()` POSTs to `/api/photos` → `403`; after 20 retries it
>    gives up silently (Task 1).
>
> Both must work for the owner or office manager to see anything. Note there is no separate
> "photo hub" screen — photos render in the job detail view (`viewJob`, photo grid ~line
> 2050), and both `owner` and `office` roles have `jobs` in `ROLE_VIEWS` (~line 3790), so
> once the data arrives both roles will see them with no permission change needed. The
> Urgent Hub also raises `missing-photo` alerts.
>
> Because the gate cannot be opened, your job here is:
> - Prove the end-to-end path is *correct* with the gate bypassed **in a test harness
>   only** — never in shipped code. Simulate an authorised `/api/photos` and `/api/data`
>   and show a photo taken as `field-1` appearing in a second browser profile signed in as
>   the owner, and a third as the office manager. Screenshot all three.
> - Report precisely what remains blocked and why, so the owner knows this lights up the
>   moment server-side sign-in ships.
> - Check `api/photos.js` for correctness while you are in there — the `job-photos`
>   Supabase bucket is private and signed URLs are generated server-side.
>
> ### Reporting
>
> Report in plain language — the owner is not a programmer. For each of the three tasks say
> plainly whether it works, is broken, or is blocked, and attach real evidence (test
> output, screenshots). Do not describe a blocked feature as working. Update
> `docs/STATUS.md` with a dated session-log line, open a PR, and do not merge it yourself.

---

## Files the next agent will care about

| Path | Why |
|---|---|
| `index.html` ~1108–1200 | `storeFile`, `getFileURL`, photo queue, `deletePhotoFile` |
| `index.html` ~3012–3050 | `callClaude`, `aiVision`, the three `ocr*` functions |
| `index.html` ~1319 | `cloudPush` / `_syncableRecords` |
| `index.html` ~2050 | job photo grid (where photos render) |
| `api/photos.js` | upload, signed URL, delete |
| `api/_lib/serverAuth.js` | the fail-closed gate — read, do not change |
| `scripts/test-photos.mjs` | existing photo tests |
| `docs/STATUS.md` §3.8 | why the gate exists |

## Verification

- `npm test` — 307 checks currently pass; must still pass, plus new tests.
- `node scripts/qa-check.mjs` — must report `"pass": true`, no broken buttons.
- Real browser runs with `npm start` and `?demo=1`, using separate browser profiles to
  simulate different people. Screenshots of final state, per `AGENTS.md`.

## Recommendation on the IT login profile

**Have one.** Three concrete reasons:

1. **The audit trail signs actions with the session.** `audit()` records `by` and `byName`
   from `session` and falls back to `'system'` when there is none. Without a profile,
   every change you make is untraceable — which is exactly backwards for the person who
   should be most accountable.
2. **There is no "outside" for the app itself.** Checking from outside gets you the
   Supabase dashboard (raw tables) and Vercel (deploy logs). Neither shows you what a user
   sees, and neither lets you add staff or reset a forgotten code.
3. **Staff admin needs a signed-in session.** The Team screen requires `owner` or `office`.
   The `it-1` account already exists with the `office` role and now has Team access, so
   this is already set up — it just needs a code.

Use the existing `it-1` account, rename it from "Taylor Kim — Logs/IT" to your own name,
and give it its own code rather than sharing an owner's.
