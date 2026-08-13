import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const INDEX = new URL('../index.html', import.meta.url);
const SW = new URL('../sw.js', import.meta.url);
export const ASSISTANT_VERSION = '1';
const STYLE = `<link rel="stylesheet" href="./otto-assistant.css?v=${ASSISTANT_VERSION}" data-otto-assistant-style />`;
const SCRIPT = `<script src="./otto-assistant.js?v=${ASSISTANT_VERSION}" data-otto-assistant-runtime></script>`;
const BRIDGE = `<script data-otto-assistant-bridge>\nwindow.__ottoAssistantBridge = {\n  getDb: () => db,\n  getSession: () => session,\n  getRoute: () => route,\n  getLang: () => lang,\n  add: (col, obj) => add(col, obj),\n  update: (col, id, patch) => update(col, id, patch),\n  save: () => save(),\n  render: () => render(),\n  callAI: body => callAI(body),\n  callClaude: body => callAI(body),\n  openResult: (type, id, source, employeeId) => {\n    if (type === 'contract' && typeof openContractForm === 'function' && source === 'contracts') return openContractForm(id);\n    if (type === 'employee' && typeof viewWorkerProfile === 'function') return viewWorkerProfile(employeeId || id);\n    if ((type === 'payroll' || type === 'paystub') && typeof viewPayroll === 'function') return viewPayroll();\n    if (type === 'email' && typeof viewInbox === 'function') return viewInbox();\n    if (type === 'note' && typeof viewNotes === 'function') return viewNotes();\n    if (type === 'schedule' && typeof viewSchedule === 'function') return viewSchedule();\n    if (type === 'employee' && typeof viewTeam === 'function') return viewTeam();\n    if (type === 'contract' && typeof viewContracts === 'function') return viewContracts();\n    if (typeof viewHome === 'function') return viewHome();\n  }\n};\n</script>`;

export function patchIndex(source) {
  let out = source;
  out = out.replace(/\s*<script\b[^>]*\bdata-otto-assistant-bridge\b[^>]*>[\s\S]*?<\/script>\s*/g, '\n');
  out = out.replace(/\s*<script\b[^>]*\bdata-otto-assistant-runtime\b[^>]*><\/script>\s*/g, '\n');
  out = out.replace(/\s*<link\b[^>]*\bdata-otto-assistant-style\b[^>]*>\s*/g, '\n');
  if (!out.includes('</head>') || !out.includes('</body>')) throw new Error('index.html is missing head/body markers');
  out = out.replace('</head>', `  ${STYLE}\n</head>`);
  out = out.replace('</body>', `  ${BRIDGE}\n  ${SCRIPT}\n</body>`);
  return out;
}

export function patchServiceWorker(source) {
  let out = source;
  if (!out.includes("'./otto-assistant.css'")) {
    const needle = "'./otto-ui-polish.css', './otto-ui-polish.js',";
    if (!out.includes(needle)) throw new Error('sw.js UI polish shell marker missing');
    out = out.replace(needle, `${needle}\n  './otto-assistant.css', './otto-assistant.js',`);
  }
  return out;
}

export function validate(index, sw) {
  return [
    ['assistant stylesheet wired', index.includes(`href="./otto-assistant.css?v=${ASSISTANT_VERSION}" data-otto-assistant-style`)],
    ['assistant bridge wired', index.includes('data-otto-assistant-bridge')],
    ['assistant runtime wired', index.includes(`src="./otto-assistant.js?v=${ASSISTANT_VERSION}" data-otto-assistant-runtime`)],
    ['bridge precedes runtime', index.indexOf('data-otto-assistant-bridge') > -1 && index.indexOf('data-otto-assistant-bridge') < index.indexOf('src="./otto-assistant.js')],
    ['assistant CSS cached offline', sw.includes("'./otto-assistant.css'")],
    ['assistant JS cached offline', sw.includes("'./otto-assistant.js'")],
    ['assistant access bridge uses provider session', index.includes('getSession: () => session')],
    ['assistant changes use existing add/update/save', index.includes('add: (col, obj) => add(col, obj)') && index.includes('update: (col, id, patch) => update(col, id, patch)') && index.includes('save: () => save()')]
  ];
}

function run() {
  const indexPath = fileURLToPath(INDEX);
  const swPath = fileURLToPath(SW);
  const beforeIndex = fs.readFileSync(indexPath, 'utf8');
  const beforeSw = fs.readFileSync(swPath, 'utf8');
  const afterIndex = patchIndex(beforeIndex);
  const afterSw = patchServiceWorker(beforeSw);
  const failed = validate(afterIndex, afterSw).filter(([, ok]) => !ok);
  if (failed.length) throw new Error(`Ask OTTO patch validation failed: ${failed.map(([name]) => name).join(', ')}`);
  if (afterIndex !== beforeIndex) fs.writeFileSync(indexPath, afterIndex);
  if (afterSw !== beforeSw) fs.writeFileSync(swPath, afterSw);
  console.log(`Ask OTTO patch: index ${afterIndex === beforeIndex ? 'already applied' : 'applied'}; sw ${afterSw === beforeSw ? 'already applied' : 'applied'}; validated`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) run();
