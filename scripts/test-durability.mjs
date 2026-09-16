import fs from 'node:fs';

const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const index = read('index.html');
const guard = read('otto-durability.js');
let passed = 0, failed = 0;
const check = (name, ok) => { if (ok) { passed++; console.log(`✓ ${name}`); } else { failed++; console.error(`✗ ${name}`); } };

check('core save writes IndexedDB', index.includes("await idbPut('kv', 'db', JSON.stringify(db))"));
check('core save keeps local safety copy', index.includes("localStorage.setItem('otto_db_backup', JSON.stringify(db))"));
check('core save pushes cloud state', index.includes('cloudPush();'));
check('CRUD add autosaves', /function add\([\s\S]*?db\[col\]\.unshift\(obj\); save\(\); return obj;/.test(index));
check('CRUD update autosaves', /function update\([\s\S]*?Object\.assign\(o, patch,[\s\S]*?save\(\)/.test(index));
check('daily backup threshold is 24 hours', index.includes('24 * 3.6e6'));
check('app startup checks auto backup', index.includes('maybeAutoBackup()'));
check('guard detects direct mutations', guard.includes('autosaveIfChanged') && guard.includes('setInterval(autosaveIfChanged, 1500)'));
check('guard avoids save timestamp loop', guard.includes('delete meta.updated'));
check('guard rechecks daily backup while app stays open', guard.includes('setInterval(checkDailyBackup, 60 * 60 * 1000)'));
check('guard checks save/backup around visibility changes', guard.includes("document.addEventListener('visibilitychange'") && guard.includes("window.addEventListener('pagehide'"));
check('durability runtime is wired into production page', index.includes('data-otto-durability-runtime'));

console.log(`Durability: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
