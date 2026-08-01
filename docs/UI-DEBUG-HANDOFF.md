# UI debug handoff — what was wrong, what is fixed, what you must still check

Written 2026-08-01 against `main` at `c65d682`. The owner reported the interface as
"buggy, glitchy, ridiculous". He was right. This records the fault, the fix, and the
part that **could not be verified from a sandbox** and is therefore yours.

Read `AGENTS.md` and `docs/AGENT-HANDOFF.md` before you start. Non-negotiables:
never commit to `main`, never force-push, never make `hasServerAuth()` return true,
never reference a remote image host, commit as
`EJN <ejnburrows@gmail.com>`, and never put a tool name in a commit or PR.

---

## 1. The fault that was found and fixed — do not reintroduce it

`initDraggableHUD()` was called from `finishLogin()` — for **every user, every role,
every screen size** — and made every `.card` and `.tile` draggable. A card is the
container for every list in this app: customers, jobs, invoices, the exceptions panel.

So an ordinary upward swipe to scroll a list picked the card up and carried it.

Measured at 390px with touch enabled, one normal scroll gesture on the customer list:

```
transform: translate(-0.07px, -215.89px)
data-y:    -215.89
```

216px of travel. The card ended up over its own page header with the rest of the
screen empty. That is the "glitchy".

A second, duplicate binding existed in `startApp()` (owner, >800px) binding the same
selector again.

**Fixed in PR #89.** Both bindings removed, the unused interact.js CDN script dropped,
and `initDraggableHUD` taken off the `window` export list — leaving a removed function
on that list throws at load and blanks the entire app, which is exactly the fault
PR #82 had to repair.

Also fixed: the floating assistant button sits 88px from the bottom and is 56px tall,
but page padding was 120px, so it covered whatever control ended the screen. On the
home screen it sat on the *Daily summary* button. Padding is now 168px.

`scripts/test-ui-regressions.mjs` (11 checks, in `npm test`) now pins all of it.

---

## 2. THE LESSON — read this before you trust any test result here

**The automated sweep passed while the app was visibly broken.**

25 screens × 3 widths reported: no JavaScript errors, no sideways scroll, no broken
images. Clean. And the app was unusable on a phone.

Why: interact.js loads from a CDN. The sandbox blocks outbound requests, so
`typeof interact === 'undefined'`, the draggable binding never happened, and the bug
could not occur *in the environment doing the testing*. It only misbehaves where the
CDN works — which is to say, on the owner's actual phone.

**Everything visual in this app depends on hosts a sandbox may block:**

| Resource | Host | If it fails |
|---|---|---|
| Font Awesome | cdnjs | Every icon renders as a blank coloured square |
| Newsreader + Inter | fonts.googleapis.com | All headings fall back to a system serif |
| Chart.js | jsdelivr | Charts silently do not draw |
| pdf.js | cdnjs | PDF reading fails |

So: **a green automated run here proves almost nothing about how the app looks.**
If you cannot load those hosts, say so plainly in your report rather than claiming
the UI is fine. Do not repeat the mistake this document exists to record.

---

## 2b. UPDATE 2026-08-01 — items 1 and 2 below are now answered, and one was a real fault

The blocker in §2 was environmental, not permanent: the CDNs **can** be reached from a
sandbox with `curl`, even where the browser itself cannot. Fetching the real files with
`curl` and serving them to the browser from a local HTTPS stand-in (with Chromium's
`--host-resolver-rules` pointing the real hostnames at it) tests the real app, with real
icons — which is exactly what §4 below asks for. That is now a script anyone can run:

```bash
npm start                # in one terminal
npm run qa:visual        # in another — needs a network connection
```

It refuses to run rather than report a misleading pass if it cannot fetch the assets.

**Item 1 turned up a genuine defect, now fixed.** Online the icons and fonts were fine.
Taken offline after one successful visit — a crew phone driving out of coverage — the app
lost **every icon and both webfonts**. Two independent causes:

1. `sw.js` skipped caching for any host matching `googleapis.com`, meant for the Gmail
   API. `fonts.googleapis.com` matches it too, so the stylesheet declaring every
   `@font-face` was never stored, while the font files it points at were — cached and
   unusable.
2. A cross-origin `<link>`/`<script>` without `crossorigin` is fetched in no-cors mode
   and returns an **opaque** response whose status reads `0`, so the service worker's
   `status === 200` test never matched and it stored nothing at all.

Fixed by matching API hosts exactly, adding `crossorigin="anonymous"` to the four
cacheable tags (all four hosts send `access-control-allow-origin: *`), and precaching the
icon/font stylesheets **plus the `.woff2` files they reference** at install — parsed out
of the stylesheet rather than hardcoded, because those URLs carry version hashes.

**A warning for whoever tests this next.** When the `.woff2` is missing and every icon is
a blank box, `getComputedStyle(el, '::before').fontFamily` still reads
`"Font Awesome 6 Free"`. The name proves nothing. Measure a glyph against a deliberately
absent font — equal widths mean the browser is drawing tofu. The first version of this
check passed while the icons were broken.

Still true, and still yours: **a real phone** (item 3), and human judgement on items 4
and 5. Chart.js is not precached, so KPI charts do not draw offline — the app shows its
"Charts appear here once connected." placeholder, which is honest, and this was left
alone deliberately rather than adding 200KB to every install.

## 3. What you must verify, because it could not be verified from here

This is the actual work. Do it on a real device, or in a browser with working
internet, signed in as a real user.

1. **Do the icons render?** Every tile, button and list row uses a Font Awesome
   glyph. In a CDN-blocked environment they appear as solid coloured squares —
   which is what the owner may be seeing. Confirm on a real connection, and then
   confirm again with the network throttled to offline **after** one successful
   load, because the service worker is supposed to have cached them. If it has
   not, an offline crew phone loses every icon in the app, and that is a real
   defect for a field tool that promises offline working.
2. **Do the fonts load, and does the layout hold when they do not?** Headings use
   `'Newsreader', serif`. Check the fallback does not reflow or clip anything.
3. **Walk all 25 screens at 390px on a real phone**, not an emulator. Report per
   screen: does it render, is anything cut off, does scrolling work normally, does
   anything move that should not.
4. **The facelift residue.** Commit `cee5f5f` added glass panels, gradient theme
   backdrops, a PlumbBot modal and per-person themes (`theme-otto`, `theme-julio`,
   `theme-saray`, `theme-field`). None of it was reviewed by a human on a device.
   Check contrast, check the modal opens and closes and traps focus sensibly, and
   check the themes are not making text unreadable.
5. **The horizontal filter strip on Jobs** (`.tabs`, `overflow-x: auto`,
   scrollbar hidden). "Completed" and "Canceled" sit 242px and 353px past the right
   edge. This is a legitimate scrolling strip and the page does **not** scroll
   sideways — but with the scrollbar hidden there is no hint those filters exist.
   Owner's call whether to add an affordance; do not "fix" it silently.

---

## 4. How to test this app so a fault cannot hide

Add this to whatever you do, every time:

- **Force the CDN libraries to be present**, do not assume. Playwright:
  `await page.addInitScript(interactSource)` or `page.route()` to fulfil the
  request from a local copy. Otherwise you are testing a different app.
- **Use real PointerEvents.** Synthetic `TouchEvent`s do not drive interact.js and
  will make a drag bug look absent. `pointerdown` → several `pointermove` →
  `pointerup`, with `pointerType: 'touch'`.
- **Assert on computed state, not on the absence of errors.** The check that caught
  this was reading `element.style.transform` after a gesture. "No console errors"
  caught nothing.
- **Screenshot and look at it.** Every fault in this repo's history was visible.

## 5. Definition of done

1. `npm test` → **359 checks, 0 failed**. A partial run is not a pass.
2. `node scripts/qa-check.mjs` → `"pass": true`, `missingHandlers: []`.
3. Real app, real browser, real connection: every screen you touched, zero
   JavaScript errors, zero blank icons, no sideways scroll, screenshots attached.

Report in plain language — the owner is not a programmer. Say **works**, **broken**,
or **blocked** for each item. Never call something working that you could not load.
Add a dated line to the session log in `docs/STATUS.md`. Open a PR. Do not merge it.
