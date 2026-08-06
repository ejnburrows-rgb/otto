# Facelift finish — what this change is

This branch started as a verification pass and ended up finding a real fault. Two
things are in it:

1. **A fix:** the two webfonts did not survive a phone losing signal. The icons
   did, which is what made it look fine. Fixed, and proven fixed.
2. **Two extra checks** in the test suite, covering faults that have shipped here
   before and that nothing in the suite would currently catch.

Nothing under `api/` changed. No keys, no environment variables, no server
gating. `hasServerAuth()` still returns `false`.

## The fault

`sw.js` held a hardcoded list of the stylesheets to cache for offline use:

```js
const CDN_SHELL = [
  '…/font-awesome/6.5.1/css/all.min.css',
  '…/css2?family=Newsreader:…&family=Inter:…',   // ← the page stopped asking for this
];
```

The approved-dashboard work then added **Hanken Grotesk** and **JetBrains Mono**
to the stylesheet link in `index.html`. `sw.js` was not updated. From that point
the service worker cached a stylesheet the page never requests, and the page
requested a stylesheet the worker had never cached — so on a phone that opened
the app once and drove out of signal, **every webfont fell back to the system
font.** The icons carried on working, because their URL had not changed, and that
is exactly why nobody noticed.

The same two URLs written down in two files, one of them updated. That is the
shape of it.

### The fix

`sw.js` no longer writes the URLs down. At install it fetches `./index.html` —
which it is already caching — reads the cross-origin stylesheet links out of it,
and caches those plus the `.woff2` files they reference. One URL, one place, and
it cannot drift again. Cache name bumped `otto-crm-v5` → `v6` so devices pick up
the new rules.

### Why the existing tests passed while it was broken

Two checks in `scripts/test-ui-regressions.mjs` asserted that the hardcoded
`CDN_SHELL` list *existed*. It did exist. It was also wrong. The list existing was
never the point — the two URLs agreeing was. Both checks are replaced with ones
that hold: the worker derives its list from the page, and **no** stylesheet URL is
hardcoded in `sw.js` at all.

## Also added — two checks for faults with no coverage

In `scripts/test-ui-regressions.mjs`:

- **every inline script parses.** Fault #1 in `AGENTS.md`: one unmatched `}` meant
  no JavaScript ran and the live site served a white screen. Every other check in
  the suite reads the file as text and would not have noticed. (`new Function`
  parses the body without running it.)
- **every committed image exists on disk.** The existing check proved image paths
  were *local*. A local path can still point at a file nobody committed, which
  renders as nothing and looks perfectly fine in the source.

## Test output

```
$ npm test
372 passed, 0 failed
```

```
$ node scripts/qa-check.mjs
"missingHandlers": []
"notOnWindowExport": []
"missingSpanishCount": 0
"pass": true
```

```
$ npm start
$ npm run qa:visual

  ok   the page is the real app
  ok   no JavaScript error on load
  ok   the icons render as real glyphs — glyph 18px vs fallback 12.4453125px
  ok   the heading font (Newsreader) loaded
  ok   the body font (Inter) loaded
  ok   the owner reaches the app
  ok   all 25 screens render at 390px — no broken image, no sideways scroll
  ok   all 25 screens render at 768px — no broken image, no sideways scroll
  ok   all 25 screens render at 1280px — no broken image, no sideways scroll
  ok   a swipe leaves the card where it was — none -> none
  ok   zero JavaScript errors
  ok   zero failed asset requests

one online visit, then the signal goes — a crew phone in the field
  ok   the app still opens with no signal
  ok   the icons are still real glyphs offline
  ok   the heading font survives offline
  ok   the body font survives offline

16 passed, 0 failed
```

Before this fix, on `main` and on this branch pre-fix, the same run gave
**14 passed, 2 failed** — the two failures being the heading and body fonts
offline. Verified against a clean checkout of `origin/main` in a separate
worktree, so the fault is `main`'s and not something this branch introduced.

## Screenshots

- `evidence/phone-home-390-online.png` — 390px, online
- `evidence/phone-home-390-offline.png` — 390px, **after the signal is taken
  away**: real check glyph on the Save button, headings in the proper webfont

The earlier screenshot set was deleted rather than kept: it was taken before the
approved-dashboard redesign landed and no longer shows the app as it is. A stale
screenshot is worse than none.

## What is NOT verified

**A real phone.** This ran in a container with no handset attached. The offline
test is a real service worker, a real cache and real cross-origin HTTPS requests
with the CDN hosts taken away — which is a fair simulation of driving out of
coverage, but it is not a phone in a hand. That distinction is how the draggable
fault reached the owner, so it is stated plainly rather than glossed.

## TODO for the owner

1. **Phone pass** — after merging, open the app on your phone with signal, then
   turn the phone's data off and reopen it. Icons and headings should look
   identical. That is the fix this PR is about.
2. **Nothing else is outstanding from this branch.** No artwork is missing — the
   only fixed image in the app is `./logo.jpg` and it loads.
3. **Unrelated, still outstanding** (unchanged here, listed so it is not
   forgotten): rotate `SUPABASE_SERVICE_ROLE_KEY` and review the Supabase access
   logs for 2026-07-31. This PR neither assumes nor performs that.

## Risk

`sw.js` changes how the offline cache is populated, which is the intended fix. If
the page's stylesheet links are ever unreadable at install, the worker caches
nothing extra and the app behaves as it did before the offline work — it does not
break, it just loses the offline fonts again, and `npm run qa:visual` says so.

No server auth or secrets changed. `api/` untouched.
