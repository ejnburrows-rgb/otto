import fs from 'fs';
import https from 'https';
import http from 'http';

const ROOT = process.cwd();
const html = fs.readFileSync(ROOT + '/index.html', 'utf8');
const scripts = html.match(/<script>[\s\S]*?<\/script>/g) || [];
const script = scripts[scripts.length - 1].replace(/<\/?script>/g, '');

const funcs = new Set();
for (const m of script.matchAll(/(?:async\s+)?function\s+([a-zA-Z_$][\w$]*)\s*\(/g)) funcs.add(m[1]);

// Catch arrow and assigned functions: const/let/var foo = () => or = function
for (const m of script.matchAll(/(?:^|[\s;{])(?:const|let|var)\s+([a-zA-Z_$][\w$]*)\s*=\s*(?:async\s+)?(?:function\b|\()/gm)) funcs.add(m[1]);

// Catch direct window.xxx = assignments (e.g. the __pin handlers)
for (const m of script.matchAll(/window\.([a-zA-Z_$][\w$]*)\s*=\s*(?:async\s+)?(?:function\b|\()/g)) funcs.add(m[1]);

// Pull names from Object.assign(window, { shorthand1, shorthand2, ... })
const assignBlock = script.match(/Object\.assign\(window,\s*\{([\s\S]*?)\}\s*\);/);
if (assignBlock) {
  for (const m of assignBlock[1].matchAll(/\b([a-zA-Z_$][\w$]*)\b(?=\s*(?:,|:\s*|\s*\}))/g)) funcs.add(m[1]);
}

const onclick = [...html.matchAll(/onclick=["']([^"']+)["']/g)].map((m) => m[1]);
const calls = new Set();
const builtins = new Set([
  'nav', 'closeModal', 'this', 'event', 'confirm', 'alert', 'prompt',
  'setSearch', 'setLang', 'setJobStatus', 'setJobSite', 'render', 'back', 'signOut',
  'toggleTheme', 'toggleFollow', 'toggleChecklistItem', 'answerDrawingQ', 'skipDrawingQ',
  'assignTakeoff', 'selectJobForTakeoff', 'window',
  // helpers that can appear inside template expressions embedded in onclick= strings
  '$', 'Number', 'stringify', 'todayISO', 'esc', 'open', 'closest', 'stopPropagation', 'JSON'
]);

for (const oc of onclick) {
  // Improved extraction: match bare calls or window.XXX( but skip .method( calls using negative lookbehind
  for (const m of oc.matchAll(/(?<![\w$.])((?:window\.)?[a-zA-Z_$][\w$]*)\s*\(/g)) {
    let full = m[1];
    let n = full.replace(/^window\./, '');
    if (!builtins.has(n)) calls.add(n);
  }
}

const missing = [...calls].filter((c) => !funcs.has(c)).sort();
const mustExport = ['photoScanCreateCustomer', 'viewUrgentHub', 'openUrgentForm', 'submitUrgentMessage', 'replyUrgent', 'resolveUrgent', 'connectQuickBooks', 'saveNotifyPrefs', 'refreshIntegrationStatus'];
const winBlock = html.match(/Object\.assign\(window[\s\S]*?\);/)?.[0] || '';
const exported = new Set([...winBlock.matchAll(/\b([a-zA-Z_$][\w$]*)\b(?=\s*[,}])/g)].map((m) => m[1]));

const i18nEn = html.match(/T\.en\s*=\s*\{([\s\S]*?)\};\s*T\.es/)?.[1] || '';
const i18nEs = html.match(/T\.es\s*=\s*\{([\s\S]*?)\};\s*function t\(/)?.[1] || '';
const enKeys = new Set([...i18nEn.matchAll(/(\w+):/g)].map((m) => m[1]));
const esKeys = new Set([...i18nEs.matchAll(/(\w+):/g)].map((m) => m[1]));
const missingEs = [...enKeys].filter((k) => !esKeys.has(k));

const collections = html.match(/COLLECTIONS\s*=\s*\[([\s\S]*?)\];/)?.[1] || '';
const colList = [...collections.matchAll(/'([^']+)'/g)].map((m) => m[1]);

function fetchUrl(url) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, { timeout: 15000 }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: data, ok: res.statusCode >= 200 && res.statusCode < 400 }));
    }).on('error', (e) => resolve({ status: 0, body: '', ok: false, error: e.message }));
  });
}

const urls = [
  ['prod', 'https://otto-kohl.vercel.app'],
  ['local', 'http://localhost:8000'],
  ['guide', 'https://otto-kohl.vercel.app/guide.html'],
  ['manifest', 'https://otto-kohl.vercel.app/manifest.json'],
  ['sw', 'https://otto-kohl.vercel.app/sw.js'],
];

const urlResults = {};
for (const [name, url] of urls) {
  urlResults[name] = await fetchUrl(url);
}

const apiQb = await fetchUrl('https://otto-kohl.vercel.app/api/quickbooks?action=status');
const apiNotify = await new Promise((resolve) => {
  const req = https.request('https://otto-kohl.vercel.app/api/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, timeout: 15000 }, (res) => {
    let data = '';
    res.on('data', (c) => (data += c));
    res.on('end', () => resolve({ status: res.statusCode, body: data, ok: true }));
  });
  req.on('error', (e) => resolve({ status: 0, error: e.message }));
  req.write(JSON.stringify({ channel: 'sms', to: '+10000000000', body: 'qa' }));
  req.end();
});

const report = {
  ts: new Date().toISOString(),
  functions: funcs.size,
  onclickCalls: calls.size,
  missingHandlers: missing,
  notOnWindowExport: mustExport.filter((f) => !exported.has(f)),
  missingSpanishKeys: missingEs.slice(0, 20),
  missingSpanishCount: missingEs.length,
  collections: colList.length,
  hasEmployeeMessages: colList.includes('employee_messages'),
  urls: Object.fromEntries(Object.entries(urlResults).map(([k, v]) => [k, { status: v.status, ok: v.ok, error: v.error }])),
  prodHasUrgent: urlResults.prod?.body?.includes('viewUrgentHub') ?? false,
  prodHasPhoto: urlResults.prod?.body?.includes('photoScanCreateCustomer') ?? false,
  prodDarkDefault: urlResults.prod?.body?.includes('data-theme="dark"') ?? false,
  apiQuickbooks: apiQb.status,
  apiNotify: apiNotify.status,
  pass: missing.length === 0 && urlResults.prod?.ok && (urlResults.prod?.body?.includes('viewUrgentHub') ?? false),
};

const lines = [
  `# OTTO QA Report`,
  ``,
  `**Run:** ${report.ts}`,
  `**Overall:** ${report.pass ? 'PASS (with notes below)' : 'ISSUES FOUND'}`,
  ``,
  `## Button wiring`,
  `- Functions in app: ${report.functions}`,
  `- Buttons checked: ${report.onclickCalls}`,
  `- Broken buttons: ${report.missingHandlers.length ? report.missingHandlers.join(', ') : 'NONE'}`,
  `- New features not on window export list: ${report.notOnWindowExport.length ? report.notOnWindowExport.join(', ') : 'NONE (browser still OK)'}`,
  ``,
  `## Spanish labels`,
  `- Missing Spanish translations: ${report.missingSpanishCount}`,
  ``,
  `## Data storage`,
  `- employee_messages collection: ${report.hasEmployeeMessages ? 'YES' : 'NO'}`,
  ``,
  `## Live checks`,
  ...Object.entries(report.urls).map(([k, v]) => `- ${k}: ${v.ok ? 'OK ' + v.status : 'FAIL ' + (v.error || v.status)}`),
  `- Production has urgent hub: ${report.prodHasUrgent}`,
  `- Production has photo customer: ${report.prodHasPhoto}`,
  `- Production dark default: ${report.prodDarkDefault}`,
  `- QuickBooks API responds: ${report.apiQuickbooks}`,
  `- Notify API responds: ${report.apiNotify}`,
  ``,
  `## JSON`,
  '```json',
  JSON.stringify(report, null, 2),
  '```',
];

fs.writeFileSync(`${ROOT}/docs/QA_REPORT.md`, lines.join('\n'), 'utf8');
console.log(JSON.stringify(report, null, 2));
process.exit(report.missingHandlers.length > 0 ? 1 : 0);