import fs from 'node:fs';
import { patchIndex, patchDataApi, patchServiceWorker, validateAuthoritativePersistence } from './apply-authoritative-persistence-patch.mjs';

let passed = 0, failed = 0;
const check = (name, ok) => { if (ok) { passed++; console.log(`✓ ${name}`); } else { failed++; console.error(`✗ ${name}`); } };

const rawIndex = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const rawData = fs.readFileSync(new URL('../api/data.js', import.meta.url), 'utf8');
const rawSw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const batchApi = fs.readFileSync(new URL('../api/save.js', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../otto-persistence.js', import.meta.url), 'utf8');

const index = patchIndex(rawIndex);
const data = patchDataApi(rawData);
const sw = patchServiceWorker(rawSw);
for (const [name, ok] of validateAuthoritativePersistence(index, data, sw)) check(name, ok);

check('batch save is provider authenticated', batchApi.includes('requireServerAuth(req, res)'));
check('batch save has one source of collection truth', batchApi.includes("import { COLLECTIONS, authorizeWrite, saveOneCollection } from './data.js'"));
check('batch save authorizes every changed collection', batchApi.includes('await authorizeWrite(url, headers, identity, { collection, records })'));
check('batch save uses the same per-record Supabase upsert', batchApi.includes('await saveOneCollection(url, headers, { collection, records })'));
check('batch save returns exact saved and failed collections', batchApi.includes('res.status(200).json({ saved, failed, confirmedAt:'));
check('persistent status names cloud truth, not button success', runtime.includes('Not saved to cloud — retrying') && runtime.includes("state === 'saved'"));
check('premature generic Saved toast is suppressed', runtime.includes('only authoritative save indicator') && runtime.includes("message === 'Saved'"));
check('direct mutations feed the same save function', runtime.includes('detectDirectMutation') && runtime.includes('save();'));
check('retry goes through the same save function', index.includes('window.__ottoRetryPendingSave = () => save();'));
check('canonical app URL is singular in persistence runtime', runtime.includes("const CANONICAL_URL = 'https://otto-kohl.vercel.app'"));
check('browser cache is labelled recovery-only', runtime.includes('recovery caches only'));

// Most important rebuild guarantee: default company/rate-card seeding must not
// happen before provider auth/cloud pull in the patched production source.
const cloudPullAt = index.indexOf('await cloudPull()');
const oldSeedAt = index.indexOf('Auto-estimating workflow: ensure rate card and company profile are seeded');
check('fresh/rebuilt browser cannot seed business data ahead of cloud', cloudPullAt > -1 && oldSeedAt === -1);

console.log(`\nAuthoritative persistence: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
