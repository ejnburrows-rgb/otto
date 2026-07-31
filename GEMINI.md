# OTTO Plumbing CRM — read before you touch anything

EJN is the owner and the client, and he is **not a programmer**. Define any
technical term in one phrase the first time you use it. He loses context between
sessions, so **this repository briefs you — you never make him brief you.**

**Read `AGENTS.md` in full, then `docs/AGENT-HANDOFF.md`, then `docs/STATUS.md`,
before doing anything else.** Do not ask him what to work on until you have. If
something is missing from those files, add it rather than asking him to remember
it next time.

The rules below are repeated here, rather than only in `AGENTS.md`, because
every one of them has already been broken in this repo and shipped to
production.

## Never

- **Never make `hasServerAuth()` in `api/_lib/serverAuth.js` return true.** It
  returns `false` on purpose. It is the only thing standing in front of the
  Supabase service-role key. Never hand-build authentication, never sign your
  own tokens, never add a development fallback secret. See `docs/STATUS.md`
  §3.8 and §3.10 — a bypass there was live earlier and let anyone read or write
  every customer record.
- **Never commit to `main`.** Branch, open a pull request, let EJN merge.
- **Never force-push.** It destroyed a session's work here once (§3.5).
- **Never put a remote URL in an `<img src=>`.** Commit the real file and use a
  relative path. Six images once shipped with image-generation *prompt text*
  where the URL belonged; all of them 404'd.
- **Never invent a link, name, number, or file path.** If you do not have a real
  one, say so and stop. A plausible wrong answer is worse than no answer.
- **Never put an AI or tool name** in a commit message, author, or PR body.

## Always

- Commit as `git commit --author="EJN <ejnburrows@gmail.com>"`.
- **Done means all three, every time — paste the real output:**
  1. `npm test` → 340 checks, 0 failed. A run that stops early is not a pass.
  2. `node scripts/qa-check.mjs` → `"pass": true`, `missingHandlers: []`.
  3. **The real app in a real browser.** `npm start`, sign in, click through
     every screen you touched. Zero JavaScript errors, zero broken images, no
     sideways scroll, and a screenshot of the final state.
- **Every fault that ever shipped here would have been caught by step 3.** A
  description of what you think happened is not evidence.
- Report in plain language. Say plainly whether a thing **works**, is **broken**,
  or is **blocked**. Never describe a blocked feature as working.
- Add one dated line to the session log at the bottom of `docs/STATUS.md`.

## Where things are

`index.html` is the entire app — one file, no build step. `api/` holds the
serverless functions. `scripts/test-*.mjs` is the suite. Live:
https://otto-kohl.vercel.app · client demo: append `?demo=1`.

## If you were handed a paste-in brief instead

`docs/PASTE-ME.md` is the same content in one self-contained block, for sessions
where this file was never loaded — a different account, a web IDE, or a tool that
reads none of these filenames. Either route gets you the same rules.
