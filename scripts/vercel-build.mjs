import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const steps = [
  ['--check', 'otto-home.js'],
  ['--check', 'sw.js'],
  ['scripts/test-photo-retry-patch.mjs'],
  ['scripts/test-otto-home.mjs'],
  ['scripts/apply-photo-retry-patch.mjs'],
  ['scripts/apply-otto-home-patch.mjs'],
  ['scripts/stamp-version.mjs']
];

for (const args of steps) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

// These files are needed only to build/verify the deployment. Remove them from
// the output directory so the public site cannot serve internal tooling.
for (const path of [
  'scripts/apply-photo-retry-patch.mjs',
  'scripts/test-photo-retry-patch.mjs',
  'scripts/apply-otto-home-patch.mjs',
  'scripts/test-otto-home.mjs',
  'scripts/stamp-version.mjs',
  'scripts/vercel-build.mjs'
]) {
  try { fs.rmSync(path); } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}
