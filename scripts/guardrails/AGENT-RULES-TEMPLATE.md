# {{PROJECT}} — read before you touch anything

The owner is the client, and is **not a programmer**. Define any technical term
in one phrase the first time you use it. They lose context between sessions, so
**this repository briefs you — you never make them brief you.**

If something is missing from these notes, add it rather than asking them to
remember it next time.

## Never

- **Never commit a credential.** Not a key, not a token, not a password, not a
  "development fallback" secret. Once it reaches the host it cannot be
  un-published, only revoked. Secrets go in `.env` (gitignored) and in the
  hosting dashboard.
- **Never hand-build authentication.** No homemade password, session, JWT or MFA
  handling. Use a real provider. If a route is gated shut on purpose, leave it
  shut and say so.
- **Never commit to the default branch.** Branch, open a pull request, let the
  owner merge.
- **Never force-push.** It erases work that is already pushed.
- **Never put a remote URL in an `<img src=>`** unless that host is a dependency
  you control. Commit the real file and use a relative path.
- **Never invent a link, name, number, or file path.** If you do not have a real
  one, say so and stop. A plausible wrong answer is worse than no answer.
- **Never put an AI or tool name** in a commit message, author, or PR body.

## Always

- **Done means all three, every time — paste the real output:**
  1. The full test suite, with the total. A run that stops early is not a pass.
  2. Whatever lint / static check the project has, clean.
  3. **The real thing, actually running.** Start it, use the part you changed,
     and capture a screenshot or real output. A description of what you believe
     happened is not evidence.
- **Most faults that reach production would have been caught by step 3.**
- Report in plain language. Say plainly whether a thing **works**, is **broken**,
  or is **blocked**. Never describe a blocked feature as working.
- Smallest good change that solves the task. Do not refactor working code that
  the task did not ask about.
- Re-read a file immediately before editing it. Other tools edit these repos;
  never trust your memory of a file's state.

## Corrected twice on the same thing?

Write it into this file so it never has to be explained again.
