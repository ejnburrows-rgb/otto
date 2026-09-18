// Write version.json from git, at build time.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const git = (...args) => {
  try { return execFileSync('git', args, { encoding: 'utf8' }).trim(); } catch { return null; }
};

const commit = process.env.VERCEL_GIT_COMMIT_SHA || git('rev-parse', 'HEAD') || 'unknown';
const branch = process.env.VERCEL_GIT_COMMIT_REF || git('rev-parse', '--abbrev-ref', 'HEAD') || 'unknown';

const marker = {
  project: 'OTTO Plumbing CRM',
  repository: 'ejnburrows-rgb/otto',
  sourceBranch: branch,
  commit,
  shortCommit: commit.slice(0, 7),
  builtAt: new Date().toISOString(),
  // Core CRM identity/data are local-first. Optional provider-backed actions
  // (AI and messaging) use the separate secure local-provider session.
  serverAuth: 'local-provider-session',
  legacyCloudAuth: 'supabase-dormant',
  activeMode: 'local-profile',
  storageMode: 'indexeddb-local',
};

writeFileSync(new URL('../version.json', import.meta.url), JSON.stringify(marker, null, 2) + '\n');
console.log(`version.json stamped: ${marker.shortCommit} on ${branch}`);
