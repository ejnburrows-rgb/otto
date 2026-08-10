import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

function run(cmd, args = []) {
  console.log(`> ${cmd} ${args.join(' ')}`);
  execFileSync(cmd, args, { stdio: 'inherit', env: process.env });
}

run('node', ['--check', 'otto-home.js']);
run('node', ['--check', 'sw.js']);
run('node', ['scripts/test-otto-home.mjs']);
run('node', ['scripts/apply-otto-home-patch.mjs']);
run('npm', ['install', '--no-save', '--no-package-lock', '@sparticuz/chromium']);
run('node', ['capture-wallpaper-proof.mjs']);
run('node', ['scripts/stamp-version.mjs']);

for (const file of [
  'capture-wallpaper-proof.mjs', 'build-wallpaper-proof.mjs',
  'scripts/apply-otto-home-patch.mjs', 'scripts/test-otto-home.mjs', 'scripts/stamp-version.mjs'
]) {
  try { fs.rmSync(file); } catch {}
}
