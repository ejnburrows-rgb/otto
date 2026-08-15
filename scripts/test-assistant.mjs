import fs from 'node:fs';
import assert from 'node:assert/strict';
import { patchIndex, patchServiceWorker, validate, ASSISTANT_VERSION } from './apply-assistant-patch.mjs';

const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../otto-assistant.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../otto-assistant.css', import.meta.url), 'utf8');
const vercelBuild = fs.readFileSync(new URL('./vercel-build.mjs', import.meta.url), 'utf8');
const nvidiaApi = fs.readFileSync(new URL('../api/nvidia.js', import.meta.url), 'utf8');
const patchedIndex = patchIndex(index);
const patchedSw = patchServiceWorker(sw);

for (const [name, ok] of validate(patchedIndex, patchedSw)) assert.equal(ok, true, name);
assert.equal(patchIndex(patchedIndex), patchedIndex, 'index patch is idempotent');
assert.equal(patchServiceWorker(patchedSw), patchedSw, 'service-worker patch is idempotent');
assert.match(patchedIndex, new RegExp(`otto-assistant\\.js\\?v=${ASSISTANT_VERSION}`));
assert.match(vercelBuild, /apply-assistant-patch\.mjs/, 'Vercel materializes the assistant into the deployed index and service worker');
assert.match(vercelBuild, /apply-assistant-patch\.mjs[\s\S]*qa-check\.mjs/, 'Vercel applies assistant before final QA');
/* This previously pinned the assistant to four hardcoded account ids. That made
   a newly created owner silently assistant-less, fixable only by editing the
   runtime, so the gate is now the role. The authoritative check is the server's:
   api/nvidia.js refuses anything that is not owner/office, so the client rule is
   presentation matching it rather than a control in its own right — which is why
   both halves are asserted here. */
assert.match(runtime, /ASSISTANT_ROLES = new Set\(\['owner', 'office'\]\)/, 'the assistant is gated by role, not by a hardcoded account list');
assert.match(runtime, /ASSISTANT_ROLES\.has\(s\.role\)/, 'the role gate is the one isAllowed() actually applies');
assert.doesNotMatch(runtime, /it-admin-ejn/, 'no individual account is special-cased any more');
assert.match(nvidiaApi, /requireServerAuth\(req, res, \{ roles: \['owner', 'office'\] \}\)/, 'the server independently refuses any role but owner/office');

/* Ask OTTO used to run a local search and stop, so it listed records but could
   never answer a question. These assert the one real path and the absence of a
   fabricated one. */
assert.match(runtime, /async function answerQuestion/, 'a question reaches a real server answer path');
assert.match(runtime, /state\.answerError/, 'a failed call reports the failure instead of inventing an answer');
assert.doesNotMatch(runtime, /webkitSpeechRecognition|SpeechRecognition|speechSynthesis/i, 'no voice assistant code');
assert.match(runtime, /MAX_RESULTS\s*=\s*5/, 'results are capped for low-cognitive-load UI');
assert.match(runtime, /create_note.*create_email_draft.*create_contract.*create_paystub.*create_payroll_summary.*schedule_change.*update_employee/s, 'approved create/change actions exist');
assert.match(runtime, /Confirm change|Confirmar cambio/, 'changes require confirmation');
assert.match(runtime, /No matching records found|No se encontraron registros/, 'clear empty state exists');
assert.match(runtime, /navigator\.onLine/, 'offline/online behavior is explicit');
assert.match(runtime, /type:\s*'paystub'|type === 'paystub'/, 'paystubs are searchable');
assert.match(runtime, /type:\s*'contract'|type === 'contract'/, 'contracts are searchable');
assert.match(runtime, /type:\s*'email'|type === 'email'/, 'emails are searchable');
assert.match(runtime, /type:\s*'note'|type === 'note'/, 'notes are searchable');
assert.match(runtime, /type:\s*'payroll'|type === 'payroll'/, 'payroll is searchable');
assert.match(runtime, /type:\s*'schedule'|type === 'schedule'/, 'schedules are searchable');
assert.match(runtime, /type:\s*'employee'|type === 'employee'/, 'employee records are searchable');
assert.match(css, /\.otto-assistant-trigger/, 'wrench trigger styled');
assert.match(css, /@media \(max-width: 760px\)/, 'phone layout exists');
assert.match(css, /prefers-reduced-motion/, 'reduced-motion support exists');
console.log('Ask OTTO tests passed');
