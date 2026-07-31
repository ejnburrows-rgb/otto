# Backup & security assessment — and what to fix first

Written 2026-07-31 at handover, in answer to the owner's questions: how backup works, how
many images are included, how often it runs, and how safe customer records are. Verified by
reading the code on `main` at `35e0e97`, not from memory.

## Context

The owner asked, as a client taking delivery: how does backup work, how many images get
backed up, how often does it run, and how safe are customer records? These are the right
questions to ask at handover, and the honest answers are worse than the app's own Backups
screen implies. This document records what the code actually does, verified by reading it
on `main` at `35e0e97`, and proposes a prioritised fix list.

An unrelated handoff for photo sync/OCR work is already committed at
`docs/HANDOFF-PHOTOS-OCR.md` (PR #81) and is not superseded by this.

---

## What backup actually does today

`backupNow()` (`index.html` ~4375) does `JSON.stringify(db)` and writes it into the
IndexedDB `files` store under a `bk_…` key.

| Question | Answer |
|---|---|
| What is captured | The records database only — customers, jobs, invoices, notes, photo *records*, audit log |
| **How many images** | **Zero.** Image bytes live as separate blobs in the `files` store; `db` holds only a `fileId` pointer. A restore returns photo entries whose files do not exist |
| Where it is stored | IndexedDB **on the same device as the live data** |
| How often | Only when an **owner or office manager opens the app**, and only if >24h since the last one (`maybeAutoBackup()`, called at `startApp` ~4471). Field crew opening the app triggers nothing |
| How many kept | Last **12** snapshots keep their data; older blobs are pruned while their log rows remain, so the list reads longer than what can actually be restored |
| Integrity check | `checksum()` (~4374) is `h = (h*31 + c) | 0` — a 32-bit non-cryptographic hash. Catches accidental corruption; does not detect tampering and collisions are feasible |
| Restore test | `restoreTest()` parses the JSON and checks every collection is an array. It does not verify the contents are correct |
| Offsite copy | Only the manual **Download** button (`exportAll()`, ~2953). Also excludes images |

## How safe customer records are today

**Where the records live.** Cloud sync is switched off (`/api/data` → `403`, see
`docs/STATUS.md` §3.8), so live records exist **only on each device**. There is no server
copy being written. Supabase `otto-live` still holds the July migration (3 customers,
13 jobs, 1 invoice, 19 users, 48 audit rows) and nothing since.

**What is genuinely solid:**
- Supabase has RLS enabled with no policies — deny-all. An anonymous read returns `401`,
  verified. The service-role key exists only in Vercel environment variables.
- All six sensitive server routes fail closed before touching any provider.
- Traffic is HTTPS via Vercel.
- PINs are stored as salt + hash, never readable, with a five-try lockout.

**What is not:**
- **Device storage is plaintext.** IndexedDB plus a `localStorage` mirror. Anyone holding
  the unlocked phone, or opening browser developer tools, can read every customer record.
  No encryption at rest.
- **Sign-in is enforced in the browser only.** Someone able to edit the page in their own
  browser gets past it. The lockout counter lives in `localStorage` and can be cleared.
- **PIN hashing is a single round of SHA-256** (`hashPin`, ~1224). Against a 4-digit PIN —
  10,000 possibilities — one SHA-256 round is brute-forced effectively instantly if the
  hash is ever obtained. The salt prevents cross-user rainbow tables and nothing more.
- The dead Firebase key remains in git history permanently (§3.1).
- GPS positions are recorded between check-in and check-out.

---

## The risks, worst first

1. **Photos are neither backed up nor synced.** A lost, stolen, wet or factory-reset phone
   loses every job photo on it, permanently, with no copy anywhere. For a plumbing business
   those photos are the evidence behind invoices and disputes. This is the single largest
   data-loss exposure and it is silent — see the upload-queue failure in
   `docs/HANDOFF-PHOTOS-OCR.md`.
2. **Backups sit on the same device as the data.** One lost phone loses the records and
   every snapshot of them together. It is a versioned undo history, not a backup.
3. **Backup depends on a manager opening the app.** A fortnight where only crew use it is a
   fortnight with no snapshot.
4. **A stolen unlocked phone exposes every customer record**, because storage is plaintext
   and sign-in is browser-side only.
5. **The restore test proves shape, not content** — it would pass on a structurally valid
   but empty database.

---

## Recommended fixes, in order

**1. Make the offsite export routine and honest (small, no server needed).**
Extend `exportAll()` to produce a ZIP containing the JSON *and* the image blobs from the
`files` store, so a download is a genuinely complete copy. Add a visible "last downloaded"
date on the Backups screen and nag when it is older than a week. This is the only
protection available while sync is off, and it is a day's work.

**2. Tell the truth on the Backups screen.**
It currently shows a copy count that includes pruned snapshots and a Cloud tick driven by
`_cloudAvailable`. Show the number actually restorable, state plainly that photos are not
included, and show when the last real offsite download happened.

**3. Trigger backup for every role, not just managers** — one line in `startApp`.

**4. Replace the checksum with SHA-256.** `crypto.subtle` is already used for PINs; reuse
it. Removes a 32-bit collision risk for a few lines of code.

**5. Strengthen PIN storage** to PBKDF2 with a high iteration count via `crypto.subtle`,
migrating existing hashes on next sign-in exactly as `migratePlainPins()` already does.

**6. The real fix, already scoped: server-side sign-in.** It unlocks cloud sync and photo
sync, which turns items 1–3 from mitigations into a solved problem, and it is what makes
the app safe on 19 phones.

## Files involved

| Path | What |
|---|---|
| `index.html` ~4374–4445 | `checksum`, `backupNow`, `restoreTest`, `maybeAutoBackup`, `viewBackups` |
| `index.html` ~2953 | `exportAll` / `importAll` |
| `index.html` ~1214–1245 | `randomSalt`, `hashPin`, `setUserPin`, `verifyPin` |
| `index.html` ~1108–1200 | `storeFile`, photo blob store and upload queue |
| `docs/STATUS.md` §3.8 | why the server routes fail closed |

## Verification

- `npm test` (307 checks) and `node scripts/qa-check.mjs` must stay green.
- Export from a device with photos, wipe a second browser profile, import, and confirm
  images come back — the current export cannot pass this, which is the point.
- Confirm a snapshot is taken when a field-role user opens the app.
- Extend `scripts/test-photos.mjs` and add backup coverage.
