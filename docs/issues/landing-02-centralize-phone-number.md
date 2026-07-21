TITLE: Landing: Put the phone number in one place so the owner can swap it once
LABEL: claude
BRANCH: fix/landing-centralize-phone
FILES: landing.html

---

REPO
Repository: github.com/ejnburrows-rgb/otto
Owner: ejnburrows-rgb (EJN — ejnburrows@gmail.com)
Branch: main
Every commit you make must show EJN as the author.

## Before you start

Read `AGENTS.md` in full and obey it. Branch off `main` named
`fix/landing-centralize-phone`. Never force-push.

This task edits `landing.html` only. Run it after `landing-01`.

## Background (plain language)

The landing page uses the placeholder phone number `(305) 555-1234` (dialing
`tel:+13055551234`) in many places — around lines 870, 916–919, 935, 943–948,
1025–1027, 1035. Because it is copy-pasted everywhere, replacing it with the real
business number later means hunting through the whole file. This task does NOT
invent a real number (only the owner can supply that — see
`docs/OWNER-MANUAL-STEPS.md`); it makes the number live in exactly one place so
the swap is a one-line edit.

## Exactly what to change

Define the phone number once and reference it everywhere:

- Add a single, clearly-commented constant near the top of the page's script (or a
  single obvious `data-`/config line) holding both the display form
  `(305) 555-1234` and the dial form `+13055551234`, with a comment: "OWNER: put
  the real business phone here — it updates every button on the page."
- On load, set every phone link/label from that one value (query the CTA/phone
  elements and fill their `href="tel:…"` and visible text), so no hardcoded number
  remains scattered in the markup.

Keep the current placeholder value as the constant's default so the page looks
unchanged until the owner edits it. Behavior of the buttons (still `tel:` links)
must not change. Touch only `landing.html`.

## This task is done when

- The number `(305) 555-1234` / `+13055551234` appears in exactly ONE authored
  place (the constant); every button/label is populated from it at runtime.
- Every "Call Now" / "Book" / phone-badge link still dials correctly.
- `node scripts/qa-check.mjs` passes.

## Proof required

- Terminal output of `node scripts/qa-check.mjs`.
- A short note in the PR showing the single constant and that a grep for the raw
  number now matches only that one authored line.
- A browser screenshot of the landing page with working call buttons.

## Final step (required)

Append one dated line to the "Session log" at the bottom of `docs/STATUS.md`.
Append only; on a conflict keep both lines.
