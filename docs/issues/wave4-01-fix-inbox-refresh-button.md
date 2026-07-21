TITLE: Wave 4: Fix the Inbox "Refresh" button showing as raw text
LABEL: claude
BRANCH: fix/inbox-refresh-button
FILES: index.html

---

REPO
Repository: github.com/ejnburrows-rgb/otto
Owner: ejnburrows-rgb (EJN — ejnburrows@gmail.com)
Branch: main
Every commit you make must show EJN as the author.

## Before you start

Read `AGENTS.md` in the repository root **in full** and obey it. Branch off `main`
named `fix/inbox-refresh-button`. Do not work on `main`. Never force-push.

This task edits `index.html`. Do not start it while any other `index.html` task is
open (the whole app is one file — parallel edits overwrite each other).

## Background (plain language)

On the Inbox screen, the "Refresh Inbox" button appears as literal code text —
the visitor sees `<button ...>Refresh Inbox</button>` printed on the page instead
of a real button they can click.

Why: `viewInbox()` (around line 4639) builds the button as an HTML string and
passes it as the second argument (`sub`) of the `pageHead(title, sub)` helper. But
`pageHead` (around lines 1595–1598) runs that argument through `esc()` (around
line 589), which turns `<`, `>`, `&`, quotes into visible text. So the button
markup is escaped and shown as text. This is the opposite of a security hole — it
is intended HTML wrongly routed through the text-escaper.

## Exactly what to change

Pick ONE clean approach and apply it:

- **Preferred:** give `pageHead` a third/explicit parameter for trusted action
  HTML (e.g. `actions`) that is inserted **without** `esc()`, and change
  `viewInbox()` to pass the Refresh button through that parameter instead of
  `sub`. Keep `sub` escaping unchanged for real subtitle text.
- **Or:** render the Refresh button as its own element outside `pageHead` (append
  it to the header after `pageHead` returns), so it is never escaped.

Do not change the button's label strings (`inboxRefresh` = 'Refresh Inbox' /
'Actualizar Bandeja') or its `onclick="fetchNewEmails()"`. Touch no other screen.

## This task is done when

- The Inbox screen shows a real, clickable "Refresh Inbox" button (icon + label),
  not escaped text.
- No other screen's header rendering changed.
- `npm test` and `node scripts/qa-check.mjs` both pass.

## Proof required

- Terminal output of `npm test` and `node scripts/qa-check.mjs`.
- A browser screenshot (via `npm run dev` → http://localhost:8000, sign in, open
  Inbox) showing the rendered button.

## Final step (required)

Append one dated line (2026-07-21 or later) to the "Session log" at the bottom of
`docs/STATUS.md`. Append only; if git reports a conflict there, keep both lines.
