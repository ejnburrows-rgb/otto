import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

// Vercel is the push-triggered runner. Source tests first prove that the
// authoritative persistence patch can be applied cleanly without mutating the
// checkout; the patch is then materialized once for the deployed output.
run('npm', ['test']);

run(process.execPath, ['scripts/materialize-otto-wallpapers.mjs']);

// Materialize the single persistence/auth/data-authority layer before the UI
// layers. It owns session durability, startup authority, autosave, batch cloud
// writes, canonical URL metadata, and offline caching of the persistence guard.
run(process.execPath, ['scripts/apply-authoritative-persistence-patch.mjs']);
run(process.execPath, ['scripts/apply-photo-retry-patch.mjs']);
run(process.execPath, ['scripts/apply-otto-home-patch.mjs']);
run(process.execPath, ['scripts/apply-unified-intake-patch.mjs']);
run(process.execPath, ['scripts/apply-ui-polish-patch.mjs']);
run(process.execPath, ['scripts/apply-quickbooks-handoff-patch.mjs']);
run(process.execPath, ['scripts/apply-assistant-patch.mjs']);
run(process.execPath, ['scripts/apply-hr-payroll-patch.mjs']);
run(process.execPath, ['--check', 'otto-hr-payroll.js']);
run(process.execPath, ['scripts/test-hr-payroll.mjs']);
run(process.execPath, ['scripts/qa-check.mjs']);
run(process.execPath, ['scripts/stamp-version.mjs']);

fs.rmSync('scripts', { recursive: true, force: true });
