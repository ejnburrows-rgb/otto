# Ready-to-file work items

Each `.md` file here is one complete task, written so that a coding agent with no
memory of any conversation can pick it up and do it. They are not filed on GitHub
yet.

## How to file them

1. Log in to GitHub once (this opens your browser):

   ```
   C:\Users\EJN\gh-cli\bin\gh.exe auth login
   ```

   Choose **GitHub.com**, then **HTTPS**, then **authenticate with a web browser**.

2. From the repository folder, run:

   ```
   powershell -ExecutionPolicy Bypass -File docs\issues\FILE-THESE-ISSUES.ps1
   ```

That creates the labels and files every issue.

## The waves, and why they exist

Tasks in the same wave never touch the same file, so they can run at the same time
without overwriting each other. Tasks in later waves do touch shared files, so they
have to wait.

| Wave | Task | File it changes |
|---|---|---|
| 1 | Stop shipping the hardcoded Firebase key | `index.html` |
| 1 | Fix the broken npm scripts | `package.json` |
| 1 | Correct the malformed Vercel routing rule | `vercel.json` |
| 1 | Remove published demo PINs from the checklist | `docs/DEPLOYMENT_CHECKLIST.md` |
| 2 | Stop cloud sync erasing a colleague's work | `index.html` |
| 3 | Stop storing and displaying PINs in plain text | `index.html` |
| 4 | Fix the Inbox "Refresh" button showing as raw text | `index.html` |
| 5 | Fix blank team names ("?") and the 15-vs-19 count | `index.html` |
| 6 | Make the KPIs screen show real demo numbers | `index.html` |
| landing | Fix faint service-card text → centralize phone → add booking form | `landing.html` |

Waves 2–6 all change `index.html`, which is why they are separated from Wave 1 and
from each other — only one `index.html` task runs at a time. The **landing** lane
edits `landing.html` instead, so it runs in parallel with the `index.html` waves;
within the landing lane, run `landing-01` → `landing-02` → `landing-03` in order
(they share `landing.html`).

The self-driving runner for these is `LOOP-CLAUDE.md` in the repo root.

## Important

Only Wave 1 issues carry the **`jules`** label, which is what starts the background
coding agent. Wave 2 and Wave 3 carry `wave-2` and `wave-3` instead. Add the `jules`
label to a later wave only once the previous wave has been merged.

Every task also appends one line to the Session log at the bottom of
`docs/STATUS.md`. If two tasks add a line at the same moment git may report a
conflict there — the correct fix is always to keep both lines.
