import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT_INDEX = new URL('../index.html', import.meta.url);
const HOME_RUNTIME = new URL('../otto-home.js', import.meta.url);

/* Bump this whenever otto-home.css or otto-home.js changes. It is the cache
   -busting query string on both tags, and it lives here — one place — so the
   page cannot end up asking for one version of the stylesheet and another of
   the runtime. The service worker resolves same-origin hits with the query
   ignored, so a bump never costs an offline device its home screen. */
export const HOME_ASSET_VERSION = '3';

export function patchSource(source) {
  let out = source;

  const replacements = [
    ["{ id: 'owner-2', name: 'Julio', role: 'owner'", "{ id: 'owner-2', name: 'Julio Pablo', role: 'owner'"],
    ["{ id: 'ops-1', name: 'Saray', role: 'office'", "{ id: 'ops-1', name: 'Sarays', role: 'office'"],
    ["fixUser('owner-2', 'Julio');", "fixUser('owner-2', 'Julio Pablo');"],
    ["fixUser('ops-1', 'Saray');", "fixUser('ops-1', 'Sarays');"],
    ['PlumbBot AI Assistant', 'Ask OTTO'],
    ['Online · Boss-Level Intelligence', 'Assistant'],
    ["Hello Boss! I'm PlumbBot. How can I assist you with estimates, crew dispatch, margin calculation, or job analytics today?", "Hi. Ask OTTO about today's work, jobs, estimates, payroll, or company records."],
    ['Ask PlumbBot anything...', 'Ask OTTO…'],
    ['PlumbBot AI here! I analyzed', 'OTTO received'],
    ['All systems operational. Margins and dispatch are synchronized for maximum efficiency, Boss!', 'I will use the information available in OTTO and will not invent operational status.'],
    ['Field crew status: All active jobs are mapped and tracked in real-time. No delays reported today!', 'Open Field Workers to see the current information OTTO actually has for the crew.'],
    ["const pendingPTO = db.time_off.filter(p => p.status === 'pending');", "const pendingPTO = [...(db.pto_requests || []), ...(db.time_off || [])].filter(p => p.status === 'pending');"],
    ["for (const p of db.time_off) {", "for (const p of [...(db.pto_requests || []), ...(db.time_off || [])]) {"],
    ["function approvePTO(id) { update('time_off', id, {status: 'approved'}); toast(t('ptoApproved'), 'success'); render(); }", "function approvePTO(id) { const col = get('pto_requests', id) ? 'pto_requests' : 'time_off'; update(col, id, {status: 'approved', readByWorker: false}); toast(t('ptoApproved'), 'success'); render(); }"],
    ["function denyPTO(id) { update('time_off', id, {status: 'denied'}); toast(t('ptoDenied'), 'error'); render(); }", "function denyPTO(id) { const col = get('pto_requests', id) ? 'pto_requests' : 'time_off'; update(col, id, {status: 'denied', readByWorker: false}); toast(t('ptoDenied'), 'error'); render(); }"],
    // The top bar carries the supplied crystal OTTO Plumbing Inc. wordmark. The
    // wrench-person app icon that used to sit here must not come back, and the
    // wordmark already says the company name, so the "OTTO CRM" text that stood
    // beside it was a duplicate and stays out.
    ['<img src="./icon-192.png" alt="" class="crystal-logo" />', '<img src="./logo.jpg" alt="OTTO Plumbing Inc." class="crystal-logo" data-otto-logo-slot="replaceable" />'],
    ['<img src="./icon-192.png" alt="OTTO CRM" class="crystal-logo" data-otto-logo-slot="replaceable" />', '<img src="./logo.jpg" alt="OTTO Plumbing Inc." class="crystal-logo" data-otto-logo-slot="replaceable" />'],

    // QuickBooks is deliberately out of scope. OTTO keeps its own invoices,
    // payments and generic CSV exports; there is no Intuit account/API setup.
    [' · QuickBooks · reports', ' · reports'],
    ["exportQB: 'Export for QuickBooks', ", ''],
    ["exportQB: 'Exportar a QuickBooks', ", ''],
    ["connectQuickBooks: 'Connect QuickBooks', quickBooksSection: 'QuickBooks', ", ''],
    ["connectQuickBooks: 'Conectar QuickBooks', quickBooksSection: 'QuickBooks', ", ''],
    ['<option>Cash</option><option>Check</option><option>Card</option><option>Transfer</option><option>QuickBooks</option>', '<option>Cash</option><option>Check</option><option>Card</option><option>Transfer</option>'],
    ["openUserForm, saveUser, toggleTheme,\n    cloudPullNow", "openUserForm, saveUser, toggleTheme,\n    cloudPullNow"],
    ['exportCSV, exportQuickBooks, openUserForm', 'exportCSV, openUserForm'],
    ['connectQuickBooks, saveNotifyPrefs, refreshIntegrationStatus', 'saveNotifyPrefs, refreshIntegrationStatus']
  ];

  for (const [from, to] of replacements) {
    out = out.split(from).join(to);
  }

  // Remove the QuickBooks buttons from Invoices and Payments while preserving
  // the normal create actions.
  out = out.replace(
    /<div class="btnrow"><button class="btn" onclick="openInvoiceForm\(\)"><i class="fas fa-plus"><\/i> \$\{t\('addInvoice'\)\}<\/button><button class="btn ghost" onclick="exportQuickBooks\('invoices'\)"><i class="fas fa-file-export"><\/i> QuickBooks<\/button><\/div>/g,
    '<div class="btnrow"><button class="btn" onclick="openInvoiceForm()"><i class="fas fa-plus"></i> ${t(\'addInvoice\')}</button></div>'
  );
  out = out.replace(
    /<div class="btnrow"><button class="btn" onclick="openPaymentForm\(\)"><i class="fas fa-plus"><\/i> \$\{t\('addPayment'\)\}<\/button><button class="btn ghost" onclick="exportQuickBooks\('payments'\)"><i class="fas fa-file-export"><\/i> QuickBooks<\/button><\/div>/g,
    '<div class="btnrow"><button class="btn" onclick="openPaymentForm()"><i class="fas fa-plus"></i> ${t(\'addPayment\')}</button></div>'
  );

  // Remove the QuickBooks-only button from the general Export screen.
  out = out.replace(
    /\n\s*<div class="btnrow"><button class="btn ghost block" onclick="exportQuickBooks\('invoices'\)"><i class="fas fa-file-export"><\/i> \$\{t\('exportQB'\)\}<\/button><\/div>`;/g,
    '`;'
  );

  // Remove the owner/office QuickBooks Settings card, but keep the customer
  // notification section immediately after it.
  out = out.replace(
    /\n\s*html \+= `<div class="section-title"><i class="fas fa-file-invoice-dollar"><\/i> \$\{t\('quickBooksSection'\)\}<\/div>[\s\S]*?<\/div>`;\n\s*(?=html \+= `<div class="section-title"><i class="fas fa-bell")/g,
    '\n      '
  );

  // QuickBooks status is no longer part of Settings integration checks.
  out = out.replace(
    /\s*const qbEl = \$\('#qb-status'\); const nEl = \$\('#notify-status'\);\n\s*try \{\n\s*const qb = await serverFetch\('\/api\/quickbooks\?action=status'\)[\s\S]*?\} catch \(e\) \{ if \(qbEl\) qbEl\.textContent = t\('notConfigured'\); \}\n/g,
    "    const nEl = $('#notify-status');\n"
  );

  // Remove the browser-side QuickBooks CSV compatibility helper. Generic CSV
  // export remains available through exportCSV().
  out = out.replace(
    /\n\s*\/\* ============================ QuickBooks export ============================ \*\/[\s\S]*?\n\s*function exportCSV\(col\)/g,
    '\n  function exportCSV(col)'
  );

  // Remove the OAuth launcher entirely.
  out = out.replace(
    /\n\s*async function connectQuickBooks\(\) \{[\s\S]*?\n\s*\}\n(?=\s*(?:async )?function |\s*\/\*|\s*Object\.assign)/g,
    '\n'
  );

  const link = `<link rel="stylesheet" href="./otto-home.css?v=${HOME_ASSET_VERSION}" data-otto-home-styles />`;
  const script = `<script src="./otto-home.js?v=${HOME_ASSET_VERSION}" data-otto-home-runtime></script>`;

  if (out.includes('data-otto-home-styles')) {
    out = out.replace(/<link\b[^>]*\bdata-otto-home-styles\b[^>]*>/, link);
  } else {
    if (!out.includes('</head>')) throw new Error('index.html is missing </head>');
    out = out.replace('</head>', `  ${link}\n</head>`);
  }

  if (out.includes('data-otto-home-runtime')) {
    out = out.replace(/<script\b[^>]*\bdata-otto-home-runtime\b[^>]*><\/script>/, script);
  } else {
    if (!out.includes('</body>')) throw new Error('index.html is missing </body>');
    out = out.replace('</body>', `  ${script}\n</body>`);
  }

  return out;
}

export function patchRuntime(source) {
  return source
    .split("${L ? 'QuickBooks, idioma, apariencia y equipo' : 'QuickBooks, language, appearance and team'}")
    .join("${L ? 'Idioma, apariencia y equipo' : 'Language, appearance and team'}");
}

export function validatePatchedSource(source) {
  const checks = [
    ['Julio Pablo canonical seed', source.includes("id: 'owner-2', name: 'Julio Pablo'")],
    ['Sarays canonical seed', source.includes("id: 'ops-1', name: 'Sarays'")],
    ['Julio Pablo migration', source.includes("fixUser('owner-2', 'Julio Pablo');")],
    ['Sarays migration', source.includes("fixUser('ops-1', 'Sarays');")],
    ['minimal home stylesheet wired', source.includes(`href="./otto-home.css?v=${HOME_ASSET_VERSION}" data-otto-home-styles`)],
    ['minimal home runtime wired', source.includes(`src="./otto-home.js?v=${HOME_ASSET_VERSION}" data-otto-home-runtime`)],
    ['home assets share one cache-busting version', (source.match(/otto-home\.(?:css|js)\?v=/g) || []).length === 2],
    ['PTO dashboard reads current requests', source.includes("...(db.pto_requests || [])") && source.includes("const pendingPTO = [")],
    ['PTO approval updates current requests', source.includes("get('pto_requests', id) ? 'pto_requests' : 'time_off'")],
    ['replaceable OTTO logo slot', source.includes('data-otto-logo-slot="replaceable"')],
    ['top bar carries the crystal wordmark', /<img src="\.\/logo\.jpg"[^>]*class="crystal-logo"/.test(source)],
    ['wrench-person icon is not the top-bar logo', !/<img[^>]*icon-192\.png[^>]*class="crystal-logo"/.test(source)],
    ['duplicate OTTO CRM text stays out of the top bar', !/<div class="brand">[\s\S]{0,400}?<span>OTTO CRM<\/span>/.test(source)],
    ['legacy Boss-Level copy removed', !source.includes('Boss-Level Intelligence')],
    ['legacy PlumbBot heading removed', !source.includes('PlumbBot AI Assistant')],
    ['QuickBooks API calls removed', !source.includes('/api/quickbooks')],
    ['QuickBooks connect handler removed', !source.includes('connectQuickBooks')],
    ['QuickBooks export helper removed', !source.includes('exportQuickBooks')],
    ['QuickBooks settings section removed', !source.includes('quickBooksSection')]
  ];
  return checks;
}

export function validatePatchedRuntime(source) {
  return [
    ['QuickBooks removed from minimal Tools copy', !source.includes('QuickBooks')]
  ];
}

function run() {
  const indexPath = fileURLToPath(ROOT_INDEX);
  const runtimePath = fileURLToPath(HOME_RUNTIME);

  const beforeIndex = fs.readFileSync(indexPath, 'utf8');
  const afterIndex = patchSource(beforeIndex);
  const failedIndex = validatePatchedSource(afterIndex).filter(([, ok]) => !ok);
  if (failedIndex.length) throw new Error(`OTTO home patch validation failed: ${failedIndex.map(([name]) => name).join(', ')}`);

  const beforeRuntime = fs.readFileSync(runtimePath, 'utf8');
  const afterRuntime = patchRuntime(beforeRuntime);
  const failedRuntime = validatePatchedRuntime(afterRuntime).filter(([, ok]) => !ok);
  if (failedRuntime.length) throw new Error(`OTTO runtime patch validation failed: ${failedRuntime.map(([name]) => name).join(', ')}`);

  if (afterIndex !== beforeIndex) fs.writeFileSync(indexPath, afterIndex);
  if (afterRuntime !== beforeRuntime) fs.writeFileSync(runtimePath, afterRuntime);

  console.log(`OTTO home patch: index ${afterIndex === beforeIndex ? 'already applied' : 'applied'}; runtime ${afterRuntime === beforeRuntime ? 'already applied' : 'applied'}; validated`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) run();
