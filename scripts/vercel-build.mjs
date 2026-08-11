import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

// Vercel is the reliable push-triggered runner for this repository while
// GitHub Actions is still failing before a runner is assigned. Run the complete
// current source/unit suite here instead of a hand-picked subset.
run('npm', ['test']);
run(process.execPath, ['scripts/qa-check.mjs']);

// Only after the source checks pass do we materialize the deployment patches.
// Keep the flexible-shell patch last so its additive assets/bridge survive the
// legacy home patch and are present in the static files Vercel actually serves.
run(process.execPath, ['scripts/apply-photo-retry-patch.mjs']);
run(process.execPath, ['scripts/apply-otto-home-patch.mjs']);
run(process.execPath, ['scripts/apply-flex-ui-patch.mjs']);
run(process.execPath, ['scripts/stamp-version.mjs']);

// Test/tooling source is needed to build and verify, not to serve publicly.
// Remove the entire directory after the checks and patches are complete.
fs.rmSync('scripts', { recursive: true, force: true });
