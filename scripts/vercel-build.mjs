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

// Materialize every approved deployment layer before final QA so the checks run
// against the exact HTML/service-worker surface Vercel will actually serve.
run(process.execPath, ['scripts/apply-photo-retry-patch.mjs']);
run(process.execPath, ['scripts/apply-otto-home-patch.mjs']);
run(process.execPath, ['scripts/apply-unified-intake-patch.mjs']);
run(process.execPath, ['scripts/apply-ui-polish-patch.mjs']);
run(process.execPath, ['scripts/qa-check.mjs']);
run(process.execPath, ['scripts/stamp-version.mjs']);

// Test/tooling source is needed to build and verify, not to serve publicly.
// Remove the entire directory after the checks and patches are complete.
fs.rmSync('scripts', { recursive: true, force: true });
