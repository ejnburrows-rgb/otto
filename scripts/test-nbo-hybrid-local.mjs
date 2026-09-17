import fs from 'node:fs';
import { patchIndex, patchServiceWorker, validateLocalBuild } from './apply-nbo-hybrid-local-patch.mjs';

let passed = 0;
let failed = 0;
const check = (name, ok) => {
  if (ok) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.error(`  FAIL ${name}`); }
};

const root = new URL('../', import.meta.url);
const pathExists = (name) => fs.existsSync(new URL(name, root));
const read = (name) => pathExists(name) ? fs.readFileSync(new URL(name, root), 'utf8') : '';

const patch = read('scripts/apply-nbo-hybrid-local-patch.mjs');
const runtime = read('otto-local-runtime.js');
const hybridJs = read('otto-nbo-hybrid.js');
const hybridCss = read('otto-nbo-hybrid.css');
const pkg = read('package.json');
const sourceIndex = read('index.html');
const sourceSw = read('sw.js');
const localIndex = patchIndex(sourceIndex);
const localSw = patchServiceWorker(sourceSw);

check('local-first materializer exists', Boolean(patch));
check('local profile runtime exists', Boolean(runtime));
check('hybrid interaction runtime exists', Boolean(hybridJs));
check('hybrid stylesheet exists', Boolean(hybridCss));

for (const [id, name, role] of [
  ['owner-1', 'Otto', 'owner'],
  ['owner-2', 'Julio', 'owner'],
  ['ops-1', 'Sarays', 'office'],
  ['it-admin-ejn', 'EJN', 'owner'],
]) {
  check(`${name} protected profile is declared`, runtime.includes(id) && runtime.includes(name) && runtime.includes(role));
}

for (let i = 1; i <= 10; i++) {
  const suffix = String(i).padStart(2, '0');
  check(`field employee ${suffix} is preconfigured`, runtime.includes(`employee-pay-sheet-${suffix}`));
}
check('preconfigured field profiles are not login shortcuts', runtime.includes('loginAccess: false') && runtime.includes('user.loginAccess === true'));
check('employee compensation is not embedded in public source', !runtime.includes('hourlyRate'));

check('runtime declares local mode', runtime.includes('__nboLocalMode'));
check('runtime does not contain a Supabase client', !/createClient|supabase\.co|SUPABASE_/i.test(runtime));
check('runtime never hardcodes a password or PIN', !/password\s*:|pin\s*:/i.test(runtime));

check('materializer replaces cloud auth boot', patch.includes("replaceFunction(out, 'initCloudAuth'") || patch.includes("replaceFunction(out,'initCloudAuth'"));
check('materializer replaces cloud push', patch.includes("replaceFunction(out, 'cloudPush'") || patch.includes("replaceFunction(out,'cloudPush'"));
check('materializer replaces save with local confirmation', patch.includes("replaceFunction(out, 'save'") || patch.includes("replaceFunction(out,'save'"));
check('materializer wires local runtime', patch.includes('otto-local-runtime.js'));
check('materializer wires hybrid UI', patch.includes('otto-nbo-hybrid.css') && patch.includes('otto-nbo-hybrid.js'));
check('materializer caches hybrid assets offline', patch.includes('patchServiceWorker'));

for (const [name, ok] of validateLocalBuild(localIndex, localSw)) check(`transformed build: ${name}`, ok);
check('transformed build does not push CRM records to the cloud', !localIndex.includes("serverFetch('/api/save'"));
check('transformed build persists local records in IndexedDB', localIndex.includes("idbPut('kv', 'db', snapshot)"));
check('transformed build uses local profile chooser for sign-out', localIndex.includes('__nboShowProfileChooser'));
check('materializer is idempotent', patchIndex(localIndex) === localIndex && patchServiceWorker(localSw) === localSw);

check('hybrid CSS keeps a restrained neutral product palette', hybridCss.includes('--nbo-bg') && hybridCss.includes('--nbo-surface') && hybridCss.includes('--nbo-accent'));
check('hybrid CSS includes visible focus treatment', /focus-visible/.test(hybridCss));
check('hybrid CSS respects reduced motion', /prefers-reduced-motion/.test(hybridCss));
check('hybrid runtime exposes profile switching without adding primary navigation', hybridJs.includes('nbo-profile') && !hybridJs.includes("PRIMARY.push"));

check('package runs the hybrid behavior test', pkg.includes('test-nbo-hybrid-local.mjs'));

console.log(`\nNBO hybrid local checks: ${passed} passed / ${failed} failed\n`);
if (failed) process.exit(1);
