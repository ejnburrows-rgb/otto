// Write version.json from git, at build time.
//
// It used to be edited by hand. It was last touched on 2026-07-29 and still
// named a commit from before that, so the deployed site could not tell you which
// build it was — and "production is up to date" was a claim nobody could check.
// `docs/DEPLOYMENT-VERIFY.md` is built around this marker, so a stale one makes
// that whole procedure meaningless.
//
// Run by `npm run build` locally. Vercel does NOT run this file: .vercelignore
// keeps scripts/ out of the upload, so it would not exist in the build. The
// same marker is written there by an inline buildCommand in vercel.json — the
// two must agree, and the shape is asserted by test-ui-regressions.mjs.

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const git = (...args) => {
  try { return execFileSync('git', args, { encoding: 'utf8' }).trim(); } catch { return null; }
};

// Vercel exposes the commit in the environment; git may not be available there.
const commit = process.env.VERCEL_GIT_COMMIT_SHA || git('rev-parse', 'HEAD') || 'unknown';
const branch = process.env.VERCEL_GIT_COMMIT_REF || git('rev-parse', '--abbrev-ref', 'HEAD') || 'unknown';

const marker = {
  project: 'OTTO Plumbing CRM',
  repository: 'ejnburrows-rgb/otto',
  sourceBranch: branch,
  commit,
  shortCommit: commit.slice(0, 7),
  builtAt: new Date().toISOString(),
  // Restated so the deployed artifact itself carries the claim, not just a doc:
  // the sensitive server routes are closed until real server-side sign-in ships.
  serverAuth: 'fail-closed',
};

writeFileSync(new URL('../version.json', import.meta.url), JSON.stringify(marker, null, 2) + '\n');
console.log(`version.json stamped: ${marker.shortCommit} on ${branch}`);
