TITLE: Landing: Add a real "Book a Plumber" request form (UI now, send later)
LABEL: claude
BRANCH: feat/landing-booking-form
FILES: landing.html

---

REPO
Repository: github.com/ejnburrows-rgb/otto
Owner: ejnburrows-rgb (EJN — ejnburrows@gmail.com)
Branch: main
Every commit you make must show EJN as the author.

## Before you start

Read `AGENTS.md` in full and obey it. Branch off `main` named
`feat/landing-booking-form`. Never force-push.

This task edits `landing.html` only. Run it after `landing-02`.

## Background (plain language)

The landing page looks like a booking tool but is only a brochure: every "Book a
Plumber" / "Book Now" button is just a `tel:` link (around lines 870–873, 919),
and there is no form anywhere — so no lead is ever captured. Actually sending a
submitted lead needs a notification account (Twilio/SendGrid) that the owner has
not connected yet (see `docs/OWNER-MANUAL-STEPS.md`), so this task builds the form
and wires it to degrade gracefully until those keys exist.

## Exactly what to change

Add a simple, accessible booking/contact form to `landing.html`:

- Fields: name, phone, and a short "what do you need" message (keep it minimal).
  Proper labels, required attributes, mobile-friendly input types.
- On submit: attempt to POST to the existing serverless notify path if one is
  wired; if it is not configured (returns 503 / no endpoint), **degrade
  gracefully** — show a friendly "Call us now" fallback that opens the `tel:` link
  built from the single phone constant added in `landing-02`. Never show a raw
  error or silently lose the input.
- Point the "Book a Plumber" / "Book Now" buttons at this form (smooth-scroll or
  reveal it) instead of only dialing — but keep a visible phone option too.

Match the page's existing style. Do not add external libraries. Touch only
`landing.html`.

## This task is done when

- A visitor can fill in name/phone/need and submit.
- With no backend connected, submitting shows the graceful "call us" fallback (no
  error, input preserved); the buttons reach the form.
- `node scripts/qa-check.mjs` passes (no dead buttons / missing handlers).

## Proof required

- Terminal output of `node scripts/qa-check.mjs`.
- Browser screenshots: the form, and the graceful fallback after submitting with
  no backend.

## Final step (required)

Append one dated line to the "Session log" at the bottom of `docs/STATUS.md`.
Append only; on a conflict keep both lines.
