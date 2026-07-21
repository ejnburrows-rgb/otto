TITLE: Landing: Fix the faint, low-contrast service-card text
LABEL: claude
BRANCH: fix/landing-service-card-contrast
FILES: landing.html

---

REPO
Repository: github.com/ejnburrows-rgb/otto
Owner: ejnburrows-rgb (EJN — ejnburrows@gmail.com)
Branch: main
Every commit you make must show EJN as the author.

## Before you start

Read `AGENTS.md` in full and obey it. Branch off `main` named
`fix/landing-service-card-contrast`. Never force-push.

This task edits `landing.html` only, so it can run in parallel with the
`index.html` app-fix waves. Among the `landing.html` tasks, run them in order
(this one first).

## Background (plain language)

On the marketing page, the description text under each "What We Do" service card
is very faint and hard to read. It uses `.service-card p { color: var(--text-muted) }`
(around lines 677–681), and `--text-muted` is `rgba(248, 250, 252, 0.6)` (around
line 26) — 60% white on a dark teal background, which fails readability. See
`docs/A11Y_AUDIT.md` for context.

Note: `--text-muted` is reused in ~14 places (around lines 104, 128, 178, 250,
326, 562, 586, 620, 679, 729, 784, 800…), so changing the variable affects the
whole page — that is acceptable if it raises contrast everywhere, but check the
page still looks right.

## Exactly what to change

Raise the contrast of the muted text to meet WCAG AA for body text (contrast ratio
≥ 4.5:1 against its dark background). Either raise the alpha / lighten
`--text-muted` globally (e.g. to ~0.85–0.9 or a solid light value) if that reads
well everywhere, or, if a global change harms other spots, add a targeted
higher-contrast color on `.service-card p` specifically. Prefer the smallest
change that fixes readability without redesigning the page.

Touch only `landing.html`.

## This task is done when

- The service-card descriptions are comfortably readable (AA contrast) on the
  dark background.
- No layout or color regressions elsewhere on the landing page.
- `node scripts/qa-check.mjs` passes.

## Proof required

- Terminal output of `node scripts/qa-check.mjs`.
- Before/after browser screenshots of the "What We Do" services section
  (`npm run dev` → http://localhost:8000/landing.html).

## Final step (required)

Append one dated line to the "Session log" at the bottom of `docs/STATUS.md`.
Append only; on a conflict keep both lines.
