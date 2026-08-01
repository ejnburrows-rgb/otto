# Facelift finish — what this change is

**Short version:** the facelift was already fixed in code. What it had never had
was proof. This branch supplies the proof, and pins the three faults that caused
the trouble so the test suite fails loudly if any of them ever comes back.

Nothing in `index.html`, `api/`, or `sw.js` changed. No server gating, no keys,
no environment variables were touched.

## What I found before changing anything

The brief for this session listed six things to fix. Five of them were already
done, on `main`, by PRs #82, #83 and #89. I checked each one rather than assuming:

| Asked for | Actual state on `main` |
|---|---|
| Fix the sign-in syntax error | Already fixed. The page parses — every inline script compiles cleanly |
| Remove interact.js and the draggable HUD | Already removed, including the CDN `<script>` tag. Nothing in the file binds a drag |
| Replace image `src`s holding prompt text | Already replaced. The only fixed image path in the app is `./logo.jpg`, which is committed and loads |
| No `<img>` pointing at an external host | Confirmed — there are none |
| Functions exported to `window` all defined | Confirmed — `qa-check` reports `notOnWindowExport: []` |
| Service worker precache | Unchanged, deliberately. No asset paths changed, so there was nothing to add |

So this branch adds no fixes to the app itself. Inventing changes to code that is
already correct would have been the risky move.

## What this branch actually adds

### `scripts/qa-visual.mjs` (new) — the browser gate, automated

`AGENTS.md` requires every UI change to be opened in a real browser and
screenshotted. That step was being done by hand, or skipped. This runs it:

- signs in as the owner through the real sign-in screen (sets the first-run code,
  taps the keypad — no shortcuts through the app's internals);
- visits home, jobs, customers, estimates, invoices, backups and settings at
  desktop width (1280px) and phone width (390px, touch enabled);
- fails on any JavaScript error, any broken image (`naturalWidth === 0`, which is
  how a 404'd image looks — invisible in the source), and any sideways scroll;
- performs a swipe across a list card and asserts the card does not follow the
  pointer — the exact gesture that was unusable on the owner's phone;
- writes a screenshot of every screen to `evidence/`.

Run it with `npm run qa:visual` (the local server must be running).

Three environment variables exist for machines that cannot do what a normal
laptop does, and all three are optional: `QA_CHROME` (path to a browser, if
Playwright cannot download one), `QA_PROXY`, and `QA_ASSETS`. `QA_ASSETS` points
at a folder holding the same Font Awesome and Google Fonts files the app loads
from a CDN, and serves them to the browser from disk. It changes nothing about
the app — it stands in for the network, so the screenshots show icons instead of
empty boxes. See the note on offline below, which is the reason it was needed.

### `scripts/test-ui-regressions.mjs` — three checks added (11 → 14)

- **every inline script parses.** This is fault #1 in `AGENTS.md`: one unmatched
  `}` meant no JavaScript ran and the live site served a white screen. Every
  other check in the suite reads the file as text and would not have noticed.
- **every committed image actually exists on disk.** The existing check proved
  image paths were local. A local path can still point at a file nobody
  committed, which renders as nothing and looks perfectly fine in the source.
- **the page has an inline script to check** — so the parse check can never
  quietly pass by finding nothing to parse.

### `package-lock.json` — one leftover removed

Running `npm install` dropped `jsonwebtoken` and its four dependencies from the
lock file. `package.json` stopped listing it when the hand-rolled JWT sign-in was
removed in PR #82, but the lock file still pinned it. Nothing imports it. The
library that the security incident was built on is now gone from the project's
dependency record entirely.

## Test output

```
$ npm test
354 passed, 0 failed
```
(340 before this branch → 351 after PR #89 added the UI regression file → 354 with
the three checks added here.)

```
$ node scripts/qa-check.mjs
{
  "ts": "2026-08-01T10:54:52.797Z",
  "functions": 398,
  "onclickCalls": 124,
  "missingHandlers": [],
  "notOnWindowExport": [],
  "missingSpanishKeys": [],
  "missingSpanishCount": 0,
  "collections": 42,
  "hasEmployeeMessages": true,
  "urls": {
    "prod":     { "status": 200, "ok": true },
    "local":    { "status": 200, "ok": true },
    "guide":    { "status": 200, "ok": true },
    "manifest": { "status": 200, "ok": true },
    "sw":       { "status": 200, "ok": true }
  },
  "prodHasUrgent": true,
  "prodHasPhoto": true,
  "prodDarkDefault": true,
  "apiQuickbooks": 200,
  "apiNotify": 403,
  "pass": true
}
```
`apiNotify: 403` is correct and expected — that is the security gate refusing an
unauthenticated call, which is what it is there to do.

```
$ npm start
$ npm run qa:visual
desktop — 1280x900
  ok   signing in reaches the app
  ok   home: no broken images
  ok   home: no sideways scroll
  ... (jobs, customers, estimates, invoices, backups, settings — all ok)
  ok   swiping 146px up a list card does not carry the card (moved 3px)
  ok   the card returns to rest
  ok   0 JavaScript errors

phone-viewport — 390x844
  ... same seven screens, all ok
  ok   swiping 98px up a list card does not carry the card (moved 3px)
  ok   the card returns to rest
  ok   0 JavaScript errors

36 passed, 0 failed
```

The 3px is deliberate: `.card:hover` lifts a card by that much, and a mouse left
resting on a card is hovering it. The fault being guarded against moved the card
by the whole length of the swipe — 216px, measured — so the check asks whether
the card *followed the pointer*, not whether it moved at all. It also confirms
the card settles back once the pointer leaves.

## Screenshots

In `evidence/`, sixteen files, regenerated on every run:

- `desktop-<screen>-1280.png` — home, jobs, customers, estimates, invoices,
  backups, settings
- `phone-viewport-<screen>-390.png` — the same seven
- `desktop-scroll-card-1280.png` and `phone-viewport-scroll-card-390.png` — the
  customer list immediately after the swipe test

## Verified, and what is not

**Verified, with evidence attached:** the app boots, sign-in works, all seven
screens render with zero JavaScript errors, zero broken images and no sideways
scroll at both widths; icons, fonts, the logo and the per-person theme colours
all render; a swipe does not drag a card.

**Not verified — and I am not going to claim otherwise:** a real phone. This
session runs in a container with no phone attached, so the phone-width evidence
is a 390px touch-enabled browser, not an actual handset. That distinction is the
whole reason the draggable-HUD fault reached the owner, so it is stated plainly
rather than glossed. See the owner TODO below.

## One thing the owner should know about being offline

Not a fault introduced here, and nothing in this branch changes it — but the
browser run made it visible, so it is written down.

Every icon in the app and both fonts load from CDNs (`cdnjs.cloudflare.com`,
`fonts.googleapis.com`, `cdn.jsdelivr.net`). When the browser in this container
could not reach them, the app still worked perfectly — but every icon rendered as
an empty box. `sw.js` caches those files after one successful online visit, so
this only affects a device that has *never* loaded the app with a signal. For a
plumbing crew that is a real scenario: a phone set up in a basement or a truck
with no bars gets a working but iconless app on its first visit.

The fix would be to commit the icon font into the repo (roughly 200KB) and drop
the CDN link. That is a real change to how the app loads and it is the owner's
call, not something to slip into a PR about evidence. **Owner decision needed —
no action required today.**

## TODO for the owner

1. **Phone pass.** Open https://otto-kohl.vercel.app on your actual phone once
   this merges, sign in, and scroll the customer list. It should scroll normally
   and nothing should drag. If it does drag, say so — that means something on
   the live site differs from this branch.
2. **Icons offline** — decide whether to commit the icon font (see above).
3. **No artwork is missing.** The brief anticipated needing placeholder image
   files. None were needed: the only fixed image in the app is `./logo.jpg` and
   it is committed and loads. No placeholder files were created and no `TODO`
   artwork lines exist.
4. **Unrelated and still outstanding** (unchanged by this branch, listed so it is
   not forgotten): rotate `SUPABASE_SERVICE_ROLE_KEY` and review the Supabase
   access logs for 2026-07-31. This PR neither assumes nor performs that, and
   touches nothing that would need it.

## Risk

No server auth or secrets changed. `api/` is untouched — `git diff` covers only
`scripts/`, `docs/`, `package.json` and new screenshot files. `hasServerAuth()`
still returns `false`, and `scripts/test-server-auth.mjs` still enforces it.
