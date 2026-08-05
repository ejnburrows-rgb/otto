# Agent handoff — OTTO Plumbing CRM

Written 2026-07-31 against `main` at `0915b3c`. Read this file top to bottom before
touching anything. If you only read one section, read §0.

---

## §0. Read this first — non-negotiable

**Read `AGENTS.md`.** It is the project's own rulebook and it outranks your habits. The
parts that have already been broken once, today:

- **Never hand-build authentication.** No homemade password, session, JWT or MFA handling.
- **Never commit to `main`.** Branch, then open a PR.
- **Never force-push.** §3.5 of `docs/STATUS.md` records a force-push destroying a
  session's work in this repo.
- **Never invent links, names, numbers or file paths.** If you do not have a real one, say
  so and stop. A plausible-looking wrong answer is worse than no answer.
- Commit as `EJN <ejnburrows@gmail.com>` — `git commit --author="EJN <ejnburrows@gmail.com>"`.
  Never put an AI or tool name in a commit message, author, or PR body.
- **No output = not done. Never fabricate test results or screenshots.**

**What just happened, so you do not repeat it.** Earlier today a facelift commit
(`cee5f5f`) plus a companion (`320cd12`) were merged and deployed. They:

1. Broke the app entirely — an unmatched `}` in the sign-in keypad meant no JavaScript ran
   and the live site booted to a blank screen.
2. Replaced the fail-closed security gate with hand-rolled JWT verification whose signing
   secret fell back to a placeholder committed to this repo.
3. Added `api/login.js`, which returned the SMS code **inside the token it handed the
   caller** and took `userId`/`role` **from the request body** — so anyone could mint an
   owner session with no PIN and read or write every customer record.
4. Wrote image-generation **prompt text** into `src=` attributes, so all six new images
   404'd and none of the facelift was visible.

All four are fixed (PRs #82 and #83). §3.10 of `docs/STATUS.md` has the detail. The point
for you: **every one of those would have been caught by opening the app in a browser once.**

---

## §1. Verify your environment before you start

Do not begin work until all of these pass. Paste the real output into your first report.

```bash
npm install                    # devDependencies only; there are no runtime deps
npm test                       # expect: 359 checks, 0 failed
node scripts/qa-check.mjs      # expect: "pass": true, missingHandlers []
npm start                      # serves http://localhost:8000
```

If `npm test` stops early complaining about a missing package, your `node_modules` is
stale — `npm install` fixes it. **A partial run is not a pass.** Sum the per-script
`N passed, N failed` lines; the total must be 340 and failures must be 0.

### Stitch MCP — connect it and prove it, before you use it

The facelift was built with Stitch and produced six broken images because prompt strings
were pasted where URLs belong. So:

1. **Prove the MCP server is connected** by listing its tools and calling one. If you
   cannot, say so plainly and stop — do not proceed and hope.
2. **Never put a Stitch URL in `src=`.** Download the asset, commit the actual file to the
   repo, and reference it with a relative path (`./logo.jpg` is the existing pattern).
   Remote asset hosts disappear; this app must work offline.
3. **Every image must be verified after you add it**: `curl -sI` it locally, and confirm in
   the browser that `naturalWidth > 0`. An `<img>` that fails renders as nothing and is
   invisible in a static read of the code.
4. If Stitch gives you no usable asset, **use what is already in the repo** (`logo.jpg`,
   the Font Awesome icon set that is already loaded) or leave the element out with a
   comment. **Do not invent a URL.**

---

## §2. What is already done — do not redo it

| Area | State |
|---|---|
| Demo mode | `?demo=1` seeds 3 customers, 5 jobs, 1 estimate, 2 invoices, 2 payments, all stamped `demo:true` and stripped from sync. `?demo=0` clears them. Covered by `scripts/test-demo-seed.mjs` |
| Roles | `owner`, `office` (incl. the IT account) reach Team and create staff; `field` does not. `scripts/test-roles.mjs` |
| Delete | customers, jobs, invoices, estimates, payments — soft delete into a stored bin; deleting a payment returns the money to its invoice |
| Backup export | `exportAll()` now includes image bytes; `importAll()` restores them and still reads older records-only exports. `scripts/test-backup-export.mjs` |
| Server gate | `hasServerAuth()` returns `false` unconditionally, on purpose. `scripts/test-server-auth.mjs` enforces it |

**Do not "fix" the server gate by making it return true.** That is the vulnerability, not
the bug. See §3.8 and §3.10 of `docs/STATUS.md`.

---

## §3. The work, in priority order

### Task 1 — Photo uploads fail silently. Make the failure visible. *(highest value)*

Confirmed, and the worst defect in the product right now.

`_drainPhotoQueue()` / `_bumpPhotoRetry()` (`index.html` 1299–1345) retry a failed upload
every 30 seconds and, after 20 attempts (~10 minutes), **delete the queue entry and give up
with no message of any kind**. The photo carries on displaying from local IndexedDB, so a
crew member believes it is filed. Because the server gate refuses everything, **every
upload currently fails this way.**

Same shape elsewhere:
- `getFileURL()` (1269) returns `null` on any failure, so on a second device the image is
  simply absent — no placeholder, no explanation.
- `deletePhotoFile()` (1351) fires a `DELETE` and ignores the result.
- `cloudPush()` (1500) logs failures to `console.warn` only.

Build a visible, persistent indicator. **Extend the Backups screen** (`viewBackups`,
4741) — it already surfaces sync and download state and is the established pattern. Do not
add a toast that fires every 30 seconds.

Tests belong in `scripts/test-photos.mjs`.

### Task 2 — OCR: prove it works, and make its failures distinguishable

Chain: `ocrDocument` / `ocrCheck` / `ocrCustomerAccount` (3369) → `aiVision()` (3360) →
`callClaude()` (3340).

`callClaude` has **two** paths and this matters: `/api/claude` (always `403`, gate), then a
fallback using a personal Anthropic key from `localStorage.otto_ai_key` entered in
Settings, calling `api.anthropic.com` directly from the browser. **So OCR can actually work
today with a key** — unlike the NVIDIA/PDF path (`callNvidia`, 3411), which is server-only
and genuinely dead until the gate opens.

What to do:
- Test `ocrCheck` against a photographed check and `ocrDocument` against an invoice with a
  real key. Report actual extracted output.
- `aiVision` does `txt.match(/\{[\s\S]*\}/)` then `JSON.parse`. Establish what happens when
  the model replies with prose, a fenced code block, or two JSON objects. A parse failure
  currently returns `null`, indistinguishable from "no key".
- `toast(t('noKey'))` fires for *every* failure — no key, bad key, offline, unparseable.
  Separate them.
- The model id `claude-sonnet-4-6` is hardcoded at several call sites. Confirm it is valid
  for vision requests; if not, correct it everywhere.
- **Raise with the owner, do not decide alone:** whether the browser-key fallback should
  exist at all. It puts a paid key in a browser. Mitigating facts: it is in `localStorage`,
  is **not** in `db.meta`, therefore never syncs, and is opt-in per device. It is also
  currently the only way any AI feature works.

### Task 3 — A photo taken on a crew phone must reach the owner and the office manager

Blocked in **two** independent places. Both must work:

1. The photo **record** — `db.photos` is in `COLLECTIONS`, so `cloudPush()` sends it to
   `/api/data` → `403`.
2. The image **bytes** — `storeFile()` (1268) → `photo_upload_queue` → `/api/photos` →
   `403`.

**No permission work is needed.** There is no separate photo hub; photos render in the job
detail view (2280), and `owner` and `office` both already have `jobs` in `ROLE_VIEWS`.
This lights up for both the moment sync works.

Your job, since the gate cannot open:
- Prove the path end-to-end with the gate bypassed **in a test harness only, never in
  shipped code**. Take a photo as `field-1`, then show it appearing in a second browser
  profile as the owner and a third as the office manager. Screenshot all three.
- Check `api/photos.js` for correctness — the `job-photos` Supabase bucket is private and
  signed URLs are generated server-side.
- Report precisely what stays blocked and why.

### Task 4 — Do not touch: server-side sign-in

The owner has chosen **Supabase Auth**. It is not yours to build in this pass. If you
believe a task needs it, stop and say so.

---

## §4. Definition of done — triple-check means these three, every time

A change is not done until all three are true and you have pasted the evidence:

1. **`npm test` full run, 0 failed, with the total.** Plus new tests covering what you
   changed. A change with no test is not finished.
2. **`node scripts/qa-check.mjs` → `"pass": true`**, `missingHandlers: []`,
   `notOnWindowExport: []`.
3. **The real app, in a real browser.** `npm start`, sign in, click through every screen
   you touched. Capture: JavaScript errors (must be **0**), broken images (must be **0**),
   horizontal overflow (must be none), and a screenshot of the final visible state. A
   description is not evidence.

Then review your own diff critically and fix what you find, before you report.

**Ways this has actually gone wrong here — check each explicitly:**
- Syntax error → nothing runs → blank page. `node --check` the script body, and load the
  page.
- Function defined inside another function but called from a top-level `onclick`.
- `Object.assign(window, …)` referencing something undefined → throws at load.
- A string-table key added to English but not Spanish, or to neither — it renders as the
  raw lowercase key. `qa-check` only compares EN against ES, so a key missing from **both**
  slips through. Check `t()` output, not just the tables.
- An `<img>` whose `src` 404s renders as nothing and looks fine in the source.

---

## §5. Reporting

Plain language — the owner is not a programmer, and every technical term gets a one-phrase
definition the first time it appears. For each task state plainly whether it **works**, is
**broken**, or is **blocked**, and attach real evidence.

Never describe a blocked feature as working. Add one dated line to the session log at the
bottom of `docs/STATUS.md`. Open a PR. **Once the required Vercel check is green, merge it yourself; do not wait for EJN to push or merge it.** If that check fails, never runs, or stays pending, report the blockage with its link — never leave a PR silently waiting.

## §6. Map of the repo

| Path | What it is |
|---|---|
| `index.html` | The entire app — 5,544 lines, single file, no build step |
| `api/` | Vercel serverless functions |
| `api/_lib/serverAuth.js` | The fail-closed gate. Read the comment. Do not open it |
| `scripts/test-*.mjs` | The suite `npm test` runs |
| `scripts/qa-check.mjs` | Static wiring check against the live site |
| `docs/STATUS.md` | Honest current state. §3.8 and §3.10 are required reading |
| `docs/BACKUP-AND-SECURITY.md` | What backup covers and what it does not |
| `AGENTS.md` | The rules. Non-negotiable |

Live app: `https://otto-kohl.vercel.app` · demo: append `?demo=1`
