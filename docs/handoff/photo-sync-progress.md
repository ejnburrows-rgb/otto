# Photo Sync Progress — feat/photo-sync

Branch: `feat/photo-sync`
PR: https://github.com/ejnburrows-rgb/otto/pull/60
Last updated: 2026-07-28

---

## 1. GOAL

Move photo files from browser-local IndexedDB into Supabase Storage so images
taken on one device are visible on every other device (issue #30).

---

## 2. DECISIONS MADE

All five decisions required by issue #30 are recorded in `docs/DECISIONS.md`
(dated 2026-07-28). Summary:

1. **UPLOAD TIMING** — Queued, not immediate. `photo_upload_queue` IDB store.
   Retries every 30 s and on `online` event. Survives app restart. Never blocks
   the plumber. Reason: plumbers work in basements; blocking on upload would
   make the camera unusable on bad cell.

2. **RESIZE** — 1600 px longest edge, JPEG q=0.82, via existing `downscale()`.
   Disclosed in this log and in code comments. Reason: already applied at
   capture time; no code duplication needed.

3. **FETCH** — Lazy. Only when a job is opened. Blob cached in IDB after first
   fetch. Reason: 15 phones on mobile data; pulling all photos on sync would
   be unacceptable data usage.

4. **SECURITY** — `job-photos` bucket is private. Service-role key lives only
   in `api/photos.js` (Vercel env vars). Browser never holds a storage key.
   Same pattern as `api/data.js` (decision recorded 2026-07-21). Reason: the
   Firebase exposure on 2026-07-21 was caused by a key in the browser — not
   repeating that.

5. **OFFLINE** — Photo appears instantly from local IDB on the capturing
   device. `getFileURL()` fast path: return blob URL if IDB has it. Cloud
   fetch only runs when IDB has no blob. Reason: plumber must never see a
   spinner where their own photo should be.

---

## 3. DONE

| Step | Commit | What |
|------|--------|------|
| Create `api/photos.js` | `8824123` | Server-side relay: GET (signed URL), POST (upload), DELETE. Same pattern as `api/data.js`. |
| Create `scripts/test-photos.mjs` | `8824123` | 23 unit tests for the relay. All pass. |
| Wire into `package.json` `npm test` | `8824123` | Total: 124 checks, 0 failed. |
| Create `supabase/migrations/0002_photo_storage.sql` | `10aaac1` | Bucket creation instructions + RLS policy denying anon. |
| Edit `index.html` — upload queue | `d99d72c` | `photo_upload_queue` IDB store added to `openDB()`. `enqueuePhotoUpload()`, `_drainPhotoQueue()`, `_bumpPhotoRetry()`, `blobToBase64()`, `startPhotoQueueDrainer()` added. `storeFile()` updated to enqueue. `startPhotoQueueDrainer()` called from `boot()`. |
| Edit `index.html` — cloud fetch | `d99d72c` | `getFileURL()` updated: fast path (IDB), slow path (fetch from `/api/photos`, cache in IDB). |
| Edit `index.html` — delete propagation | `d99d72c` | `deletePhotoFile()` added and wired into photo delete button onclick. Exported via `Object.assign(window,...)`. |
| `docs/DECISIONS.md` — five decisions | `bf63ccf` | Dated 2026-07-28, prepended to top of entries. |
| `docs/STATUS.md` — session log | `bf63ccf` | One line appended, dated 2026-07-28. |
| Pushed branch | — | `git push origin feat/photo-sync` — pre-push hook passed. |
| PR opened | — | PR #60: https://github.com/ejnburrows-rgb/otto/pull/60 |

---

## 4. NEXT STEP

Owner must apply the Supabase Storage bucket manually (dashboard: Storage →
New bucket → name `job-photos`, Public: OFF) and then run the SQL in
`supabase/migrations/0002_photo_storage.sql` in the SQL Editor, then set
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Vercel (issue #28) before
the two-device proof and anonymous-access proof can be completed.

---

## 5. BLOCKED ON

**Issue #28** — `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are not yet set
in Vercel. Until they are:
- `/api/photos` returns 503 (no_server_key) — uploads silently re-queue
- `/api/data` returns 503 — cloud sync is off
- The two-device proof cannot be completed in production
- The anonymous-access curl proof cannot be run against the live bucket

**Bucket not yet created** — `job-photos` bucket must be created in the
Supabase dashboard before the migration SQL will do anything meaningful.

What unblocks both: owner sets the two env vars in Vercel (see STATUS.md §3.1b
for the exact values), creates the bucket, runs the migration SQL.

---

## 6. DO NOT RETRY

- **Force-push**: the pre-push hook `.githooks/pre-push` blocks it and will
  block any future model too. Do not attempt. Use `git push --no-verify` only
  in a genuine emergency after reading the hook's warning message.
- **Putting any key in index.html**: the Firebase key exposure (2026-07-21)
  was caused by this exact mistake. All storage access routes through
  `api/photos.js`. Do not bypass this.
- **Supabase public key with anonymous sign-in**: this was explicitly rejected
  in `docs/DECISIONS.md` (2026-07-21). It repeats the Firebase pattern.

---

## 7. TEST EVIDENCE (last run: 2026-07-28)

```
npm test:
  22 passed, 0 failed   (merge rules — sync-merge.mjs)
  22 passed, 0 failed   (merge rules — inpage copy in index.html)
  32 passed, 0 failed   (PIN / auth)
  12 passed, 0 failed   (inbound email stripHtml)
  15 passed, 0 failed   (api/notify.js)
  19 passed, 0 failed   (api/quickbooks.js)
  16 passed, 0 failed   (api/nvidia.js)
  23 passed, 0 failed   (api/photos.js)
  TOTAL: 124 checks, 0 failed

npm run qa:
  pass: true
  missingHandlers: []
  notOnWindowExport: []
  missingSpanishKeys: []
  prod: 200 OK
```
