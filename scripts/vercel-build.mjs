import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

// Vercel is the push-triggered runner. Source tests first prove both the legacy
// OTTO layers and the NBO local transformation without mutating the checkout.
// The deployed output is materialized only after those tests pass.
run('npm', ['test']);
run(process.execPath, ['--check', 'api/register.js']);
run(process.execPath, ['--check', 'scripts/apply-account-login-patch.mjs']);
run(process.execPath, ['--check', 'scripts/apply-nbo-hybrid-local-patch.mjs']);
run(process.execPath, ['--check', 'scripts/qa-nbo-hybrid.mjs']);
run(process.execPath, ['--check', 'otto-local-runtime.js']);
run(process.execPath, ['--check', 'otto-nbo-hybrid.js']);

run(process.execPath, ['scripts/materialize-otto-wallpapers.mjs']);

// Materialize the historical OTTO layers in their proven order first. The NBO
// local layer is deliberately last: it is the approved active authority for
// identity, persistence, file lookup and presentation in this release.
run(process.execPath, ['scripts/apply-authoritative-persistence-patch.mjs']);
run(process.execPath, ['scripts/apply-account-login-patch.mjs']);
run(process.execPath, ['scripts/apply-photo-retry-patch.mjs']);
run(process.execPath, ['scripts/apply-otto-home-patch.mjs']);
run(process.execPath, ['scripts/apply-unified-intake-patch.mjs']);
run(process.execPath, ['scripts/apply-ui-polish-patch.mjs']);
run(process.execPath, ['scripts/apply-quickbooks-handoff-patch.mjs']);
run(process.execPath, ['scripts/apply-assistant-patch.mjs']);
run(process.execPath, ['scripts/apply-hr-payroll-patch.mjs']);
run(process.execPath, ['scripts/apply-nbo-hybrid-local-patch.mjs']);
run(process.execPath, ['scripts/test-nbo-hybrid-local.mjs']);

// Browser QA is kept as a dedicated script for supported runners. Vercel's
// Amazon Linux build image cannot install Playwright's Ubuntu system libraries,
// so deployment correctness is gated here by the full source/behavior suites.

run(process.execPath, ['--check', 'otto-hr-payroll.js']);
run(process.execPath, ['scripts/test-hr-payroll.mjs']);
run(process.execPath, ['scripts/qa-check.mjs']);
run(process.execPath, ['scripts/stamp-version.mjs']);

fs.rmSync('scripts', { recursive: true, force: true });
