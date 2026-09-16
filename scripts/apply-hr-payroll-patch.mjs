import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const INDEX = new URL('../index.html', import.meta.url);
const SW = new URL('../sw.js', import.meta.url);
const HR_RUNTIME = new URL('../otto-hr-payroll.js', import.meta.url);
const POLICY_RUNTIME = new URL('../otto-employee-policy-final.js', import.meta.url);
const HR_TAG = '  <script src="./otto-hr-payroll.js?v=2" data-otto-hr-payroll-runtime></script>\n';
const POLICY_TAG = '  <script src="./otto-employee-policy-final.js?v=2" data-otto-employee-policy-final></script>\n';

export function patchHrPayrollIndex(source) {
  let out = source;
  if (!out.includes('data-otto-hr-payroll-runtime')) {
    const fieldMarker = /(<script\b[^>]*src=["']\.\/otto-field\.js\?v=1["'][^>]*data-otto-field-runtime[^>]*><\/script>)/;
    if (!fieldMarker.test(out)) throw new Error('field runtime marker missing');
    out = out.replace(fieldMarker, `$1\n${HR_TAG}`);
  }
  if (!out.includes('data-otto-employee-policy-final')) {
    const hrMarker = /(<script\b[^>]*src=["']\.\/otto-hr-payroll\.js\?v=\d+["'][^>]*data-otto-hr-payroll-runtime[^>]*><\/script>)/;
    if (!hrMarker.test(out)) throw new Error('HR runtime marker missing');
    out = out.replace(hrMarker, `$1\n${POLICY_TAG}`);
  }
  return out;
}

export function patchHrPayrollSw(source) {
  let out = source;
  const files = ['./otto-hr-payroll.js', './otto-employee-policy-final.js'];
  for (const file of files) {
    if (out.includes(`'${file}'`)) continue;
    const marker = "'./otto-persistence.js'";
    if (out.includes(marker)) out = out.replace(marker, `${marker}, '${file}'`);
    else {
      const shell = "'./', './index.html', './landing.html', './guide.html', './manifest.json', './logo.jpg',";
      if (!out.includes(shell)) throw new Error('service worker shell marker missing');
      out = out.replace(shell, `${shell} '${file}',`);
    }
  }
  return out;
}

export function validateHrPayroll(index, sw, runtime, policy) {
  return [
    ['HR runtime is loaded exactly once', (index.match(/data-otto-hr-payroll-runtime/g) || []).length === 1],
    ['canonical policy runtime is loaded exactly once', (index.match(/data-otto-employee-policy-final/g) || []).length === 1],
    ['HR runtime loads after field workspace', index.indexOf('data-otto-field-runtime') < index.indexOf('data-otto-hr-payroll-runtime')],
    ['canonical policy loads after HR runtime', index.indexOf('data-otto-hr-payroll-runtime') < index.indexOf('data-otto-employee-policy-final')],
    ['HR runtime is offline cached', sw.includes("'./otto-hr-payroll.js'")],
    ['canonical policy is offline cached', sw.includes("'./otto-employee-policy-final.js'")],
    ['workspace route exists', runtime.includes("const VIEW = 'hr_payroll'")],
    ['policy remains current version 2', runtime.includes('const POLICY_VERSION = 2;') && policy.includes('const POLICY_VERSION = 2;')],
    ['final Spanish source is present', policy.includes("title: 'Código de Conducta del Empleado'") && policy.includes('Ausencia prevista o imprevista') && policy.includes('Aprobado')],
    ['complete English counterpart is present', policy.includes("title: 'Employee Code of Conduct'") && policy.includes('Planned or unplanned absence') && policy.includes('Approved')],
    ['all ten Spanish sections are present', (policy.match(/\['SECCIÓN \d+ —/g) || []).length === 10],
    ['all ten English sections are present', (policy.match(/\['SECTION \d+ —/g) || []).length === 10],
    ['digital acknowledgment requires no visible signature', policy.includes('No se requiere firma física') && policy.includes('No physical signature is required') && policy.includes("el.hidden = true")],
    ['workspace reads existing acknowledgments', runtime.includes("data('consent_records')") && runtime.includes("type === 'employee_code_of_conduct'")],
    ['field gate uses the policy workspace', runtime.includes("document.getElementById('policy-scroll')")],
    ['desktop HR Payroll tab exists', runtime.includes('data-otto-hr-tab') && runtime.includes('nav(VIEW)')],
    ['mobile More receives HR Payroll shortcut', runtime.includes('data-hr-more-shortcut') && runtime.includes('injectMoreShortcut')],
    ['payroll remains one click away', runtime.includes("nav('payroll')")],
    ['employee records remain one click away', runtime.includes("nav('team')")],
  ];
}

function run() {
  const indexPath = fileURLToPath(INDEX);
  const swPath = fileURLToPath(SW);
  const runtimePath = fileURLToPath(HR_RUNTIME);
  const policyPath = fileURLToPath(POLICY_RUNTIME);
  const beforeIndex = fs.readFileSync(indexPath, 'utf8');
  const beforeSw = fs.readFileSync(swPath, 'utf8');
  const runtime = fs.readFileSync(runtimePath, 'utf8');
  const policy = fs.readFileSync(policyPath, 'utf8');
  const afterIndex = patchHrPayrollIndex(beforeIndex);
  const afterSw = patchHrPayrollSw(beforeSw);
  const failed = validateHrPayroll(afterIndex, afterSw, runtime, policy).filter(([, ok]) => !ok);
  if (failed.length) throw new Error(`HR / Payroll patch failed: ${failed.map(([name]) => name).join(', ')}`);
  if (afterIndex !== beforeIndex) fs.writeFileSync(indexPath, afterIndex);
  if (afterSw !== beforeSw) fs.writeFileSync(swPath, afterSw);
  console.log(`HR / Payroll patch: ${afterIndex === beforeIndex && afterSw === beforeSw ? 'already applied' : 'applied'}; validated`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) run();
