TITLE: Wave 1: Correct the malformed Vercel routing rule
LABEL: jules
BRANCH: fix/vercel-routing
FILES: vercel.json

---

REPO
Repository: github.com/ejnburrows-rgb/otto
Owner: ejnburrows-rgb (EJN — ejnburrows@gmail.com)
Branch: main
Every commit you make must show EJN as the author.

## Before you start

Read `AGENTS.md` in the repository root **in full** and obey it. It is the single
source of truth for how work is done here.

Create a new branch off `main` named `fix/vercel-routing` and do all your work there.
Do not work directly on `main`. Do not force-push, ever.

## Background (plain language)

`vercel.json` tells Vercel (the hosting service) how to serve the site. It currently
contains one routing rule:

```json
{ "src": "/^.*$", "dest": "/index.html" }
```

`src` is meant to be a regular expression (a text-matching pattern). This value mixes
a leading slash with the pattern `^.*$`, which is malformed — it reads as "match a
literal slash, then a start-of-string". Vercel currently tolerates it and the live
site at https://otto-kohl.vercel.app works, including `manifest.json`, `sw.js`, and
the `/api/*` functions.

**Important:** the site is working today. This task is preventative — the rule is
fragile and could silently break a future deployment. Your change must not alter any
current behaviour.

## Exactly what to change

In `vercel.json`, either:

**Option A (preferred) — remove the rule entirely.** This project is a plain static
site; Vercel serves `index.html` at the root and the `api/` folder as functions
automatically, with no routing rule needed. Reduce the file to:

```json
{
  "outputDirectory": "."
}
```

**Option B — write the rule correctly**, if you determine after testing that a
fallback really is needed (for example if a deep link like `/jobs` must serve
`index.html`). If so, use Vercel's modern `rewrites` with a negative lookahead so
that real files, the service worker, the manifest, and the API are never captured.

Choose Option A unless testing proves a fallback is required. Do not touch any other
file.

## This task is done when

After deploying your branch as a Vercel preview, **all** of the following still hold
on the preview URL — verify each one and record the status code:

- `/` returns 200 and serves the OTTO Plumbing CRM app (roughly 310 KB, title
  "OTTO Plumbing CRM").
- `/manifest.json` returns 200.
- `/sw.js` returns 200.
- `/landing.html` and `/guide.html` load.
- `/api/notify` returns 405 to a plain GET request (it is POST-only — 405 is the
  correct, healthy answer; a 404 means you have broken it).

If any of these regress, your change is wrong — revert and try the other option.

## Proof required

In your pull request include the preview URL and the status code you observed for
each of the six checks above, as a short list. A terminal transcript of the requests
is ideal.

## Final step (required)

Append one line to the "Session log" section at the bottom of `docs/STATUS.md`
describing what you did, dated 2026-07-21 or later. Append to the end of that list;
do not edit anyone else's line. If git reports a conflict in that section, keep both
lines.
