TITLE: Wave 1: Stop shipping the hardcoded Firebase key
LABEL: jules
BRANCH: fix/remove-hardcoded-firebase-key
FILES: index.html

---

REPO
Repository: github.com/ejnburrows-rgb/otto
Owner: ejnburrows-rgb (EJN — ejnburrows@gmail.com)
Branch: main
Every commit you make must show EJN as the author.

## Before you start

Read `AGENTS.md` in the repository root **in full** and obey it. It is the single
source of truth for how work is done here. Pay particular attention to its SAFETY
RULES: this project is a CRM holding real client data.

Create a new branch off `main` named `fix/remove-hardcoded-firebase-key` and do all
your work there. Do not work directly on `main`. Do not force-push, ever.

## Background (plain language)

The app can sync data to Firebase Firestore (Google's cloud database). The settings
for that database — a project ID and an API key (a text password that identifies the
app to Google) — are currently written directly into the app's source code as a
fallback.

Because `index.html` is served to the public at https://otto-kohl.vercel.app, anyone
who opens the site and views the page source can read that key. Verified on
2026-07-21: using only that key, an anonymous request successfully read the live
`customers`, `jobs`, and `invoices` records.

Your job is to stop the app from shipping that key. **This does not fully fix the
problem** — the database's own security rules are also open, and only the owner can
change those in the Firebase console. Do not claim in your write-up that this task
closes the security hole. It removes the app's part of it.

## Exactly what to change

In `index.html`, find the `fbConfig()` function (near line 960; search for
`function fbConfig`). It currently looks like this:

```js
function fbConfig() {
  try {
    const s = JSON.parse(localStorage.getItem('otto_fb') || 'null');
    if (s && s.projectId && s.apiKey) return s;
  } catch (e) { }
  return { projectId: 'otto-crm-7f951', apiKey: 'AIzaSy...' };
}
```

Change it so that:

1. It still reads the saved settings from `localStorage` exactly as it does now.
2. If no settings are saved, it returns `null` instead of the hardcoded project ID
   and key. Delete those literal values from the file entirely.
3. Add a short comment above the function, in plain language, explaining that cloud
   sync settings are entered by the owner in Settings → Cloud Sync and are
   deliberately not stored in the code.

Then check every place that calls `fbConfig()` (search the file for `fbConfig(`) and
make sure each one behaves sensibly when it returns `null` — the app must continue
to work fully offline with no cloud sync rather than throwing an error. The existing
callers already guard with checks like `if (!cfg || !cfg.projectId || !cfg.apiKey) return;`,
so confirm this and fix any that do not.

Do not change any other behaviour. Do not touch any other file.

## This task is done when

- The strings `otto-crm-7f951` and the `AIzaSy...` key appear nowhere in
  `index.html`. Verify with a search and paste the (empty) result.
- Opening the app with no cloud settings saved still loads, lets you sign in, and
  lets you create a customer — all data staying on the device. Cloud sync simply
  stays off.
- Entering a project ID and key in Settings → Cloud Sync still turns sync on.
- No JavaScript errors appear in the browser console during the above.

## Proof required

Run the app locally (`python -m http.server 8000` from the repo root, then open
http://localhost:8000) and confirm the checks above by hand. In your pull request
include:

- The output of your search showing the key is gone.
- A screenshot of the app running with no cloud config, showing a customer being
  created successfully.
- A screenshot of the browser console showing no errors.

## Final step (required)

Append one line to the "Session log" section at the bottom of `docs/STATUS.md`
describing what you did, dated 2026-07-21 or later. Append to the end of that list;
do not edit anyone else's line. If git reports a conflict in that section, keep both
lines.
