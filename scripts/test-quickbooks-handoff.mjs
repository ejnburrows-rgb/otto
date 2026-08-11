import fs from 'node:fs';
import vm from 'node:vm';
import { patchIndex, patchServiceWorker, validate } from './apply-quickbooks-handoff-patch.mjs';

const runtime = fs.readFileSync(new URL('../otto-quickbooks-handoff.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../otto-quickbooks-handoff.css', import.meta.url), 'utf8');
const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const patchedIndex = patchIndex(index);
const patchedSw = patchServiceWorker(sw);
const executableRuntime = runtime
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

let passed = 0, failed = 0;
function check(name, ok) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (ok) passed++; else failed++;
}

for (const [name, ok] of validate(patchedIndex, patchedSw)) check(name, ok);
check('patch is idempotent', patchIndex(patchedIndex) === patchedIndex && patchServiceWorker(patchedSw) === patchedSw);

const context = {
  URL,
  Intl,
  Object,
  String,
  Number,
  Boolean,
  Array,
  Date,
  console,
  T: { en: {}, es: {} },
  lang: 'en',
  db: { companyProfile: {}, notes: [], customers: [], jobs: [], invoices: [], estimates: [] },
  session: { id: 'owner-1', role: 'owner' },
  navigator: {},
  document: { addEventListener() {} },
  window: {
    isSecureContext: true,
    openEstimateForm() {},
    openInvoiceView() {},
    open() {}
  },
  get() { return null; },
  update() {},
  save() {},
  toast() {},
  esc(value) { return String(value ?? ''); },
  money(value) { return `$${Number(value).toFixed(2)}`; },
  nowISO() { return '2026-08-11T00:00:00.000Z'; }
};
context.window.window = context.window;
vm.createContext(context);
vm.runInContext(runtime, context);
const api = context.window.__ottoQuickBooksHandoff;

check('default destination is official QuickBooks Online', api.DEFAULT_QUICKBOOKS_URL === 'https://qbo.intuit.com/');
check('only three manual statuses exist', JSON.stringify([...api.STATUSES]) === JSON.stringify(['not_started', 'ready', 'entered']));
check('secure Intuit destination is accepted', api.normalizeQuickBooksUrl('https://qbo.intuit.com/app/homepage') === 'https://qbo.intuit.com/app/homepage');
check('secure QuickBooks destination is accepted', api.normalizeQuickBooksUrl('https://quickbooks.intuit.com/') === 'https://quickbooks.intuit.com/');
check('HTTP destination is rejected', api.normalizeQuickBooksUrl('http://qbo.intuit.com/') === null);
check('lookalike Intuit host is rejected', api.normalizeQuickBooksUrl('https://intuit.com.evil.example/') === null);
check('lookalike QuickBooks host is rejected', api.normalizeQuickBooksUrl('https://quickbooks.com.evil.example/') === null);
check('credential-bearing URL is rejected', api.normalizeQuickBooksUrl('https://user:pass@qbo.intuit.com/') === null);

check('estimate detail hook exists', runtime.includes("appendPanel('estimate', id)"));
check('invoice detail hook exists', runtime.includes("appendPanel('invoice', id)"));
check('Open QuickBooks uses a separate tab', runtime.includes("window.open(url, '_blank', 'noopener,noreferrer')"));
check('opening QuickBooks does not mark a record entered', !/function openQuickBooks\([\s\S]*?\}\n[\s\S]{0,50}function installHooks/.exec(runtime)?.[0].includes('quickbooksStatus'));
check('record status persists through existing update architecture', runtime.includes("patch.quickbooksStatus = value") && runtime.includes('update(info.collection, info.record.id, patch)'));
check('reference number persists through existing update architecture', runtime.includes("patch.quickbooksReference = String(value || '').trim()"));
check('preferred destination persists on company profile', runtime.includes('db.companyProfile.quickbooksUrl = normalized') && runtime.includes('save();'));
check('preferred destination can be removed', runtime.includes('delete db.companyProfile.quickbooksUrl'));
check('destination editing is owner-only', runtime.includes("session.role === 'owner'"));
check('all requested handoff fields are represented', ['quickbooksCustomer','quickbooksAddress','quickbooksContact','quickbooksRecordNumber','quickbooksJobDescription','quickbooksLineItems','quickbooksSubtotal','quickbooksTax','quickbooksTotal','quickbooksNotes'].every(key => runtime.includes(key)));
check('Copy Details is present', runtime.includes("quickbooksCopyDetails: 'Copy Details'") && runtime.includes('copyTextBlock(info.kind, info.record)'));
check('individual Copy control is present', runtime.includes('data-qb-action="copy-value"'));
check('English translations are added', context.T.en.quickbooksStatusEntered === 'Entered in QuickBooks');
check('Spanish translations are added', context.T.es.quickbooksStatusEntered === 'Ingresado en QuickBooks');
check('mobile layout stacks handoff controls', css.includes('@media (max-width: 600px)') && css.includes('grid-template-columns: 1fr'));
check('no Intuit API route is introduced', !runtime.includes('/api/quickbooks'));
check('no OAuth flow is introduced', !/(oauth2|\/authorize\b|client_id|redirect_uri|access_token|refresh_token)/i.test(executableRuntime));
check('no fetch or XHR sends record data to QuickBooks', !runtime.includes('fetch(') && !runtime.includes('XMLHttpRequest'));
check('no fake synced or verified status is offered', !/statusSynced|statusVerified|>Synced<|>Verified</i.test(runtime));

console.log(`QuickBooks manual handoff checks: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
