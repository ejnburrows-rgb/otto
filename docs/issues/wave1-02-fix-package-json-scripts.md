TITLE: Wave 1: Fix the broken npm scripts
LABEL: jules
BRANCH: fix/package-json-scripts
FILES: package.json

---

REPO
Repository: github.com/ejnburrows-rgb/otto
Owner: ejnburrows-rgb (EJN — ejnburrows@gmail.com)
Branch: main
Every commit you make must show EJN as the author.

## Before you start

Read `AGENTS.md` in the repository root **in full** and obey it. It is the single
source of truth for how work is done here.

Create a new branch off `main` named `fix/package-json-scripts` and do all your work
there. Do not work directly on `main`. Do not force-push, ever.

## Background (plain language)

`package.json` holds the project's shortcut commands. Three of them (`dev`, `start`,
`preview`) currently point at `/home/daytona/codebase` — a folder path from a
different, cloud-based computer that does not exist on the owner's Windows machine.
They also call `python3`, which on Windows is named `python`. So all three commands
fail for the owner.

This project is a plain static site with no build step, so all these commands need to
do is serve the current folder over HTTP.

## Exactly what to change

In `package.json`, replace the `dev`, `start`, and `preview` scripts so they serve the
repository folder itself rather than a hardcoded absolute path.

Use a command that works on Windows, macOS, and Linux. The project already depends on
Node, so the simplest portable option is Node's own static server via `npx`, for
example:

```json
"dev": "npx --yes http-server . -p 8000 -c-1",
"start": "npx --yes http-server . -p 8000 -c-1",
"preview": "npx --yes http-server . -p 8000 -c-1"
```

If you prefer to keep Python, you may instead use `python -m http.server 8000` — but
verify it actually runs on Windows before choosing it. Either is acceptable; pick one
and make all three consistent.

Leave the `build` script as it is (this project genuinely has no build step). Do not
change the `devDependencies`. Do not touch any other file.

## This task is done when

- `npm run dev` starts a working web server from the repository folder on Windows.
- Opening the address it prints in a browser loads the OTTO Plumbing CRM login screen.
- The string `/home/daytona/codebase` no longer appears anywhere in `package.json`.

## Proof required

In your pull request include:

- The full terminal output of `npm run dev` showing the server starting.
- A screenshot of the app's login screen loaded from that local server.

## Final step (required)

Append one line to the "Session log" section at the bottom of `docs/STATUS.md`
describing what you did, dated 2026-07-21 or later. Append to the end of that list;
do not edit anyone else's line. If git reports a conflict in that section, keep both
lines.
