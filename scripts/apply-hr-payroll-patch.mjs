import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const INDEX = new URL('../index.html', import.meta.url);
const SW = new URL('../sw.js', import.meta.url);
const SCRIPT_TAG = '  <script src="./otto-hr-payroll.js?v=1" data-otto-hr-payroll-runtime></script>\n';

export function patchHrPayrollIndex(source) {
  if (source.includes('data-otto-hr-payroll-runtime')) return source;
  const marker = '  <script src="./otto-field.js?v=1" data-otto-field-runtime></script>\n';
  if (!source.includes(marker)) throw new Error('field runtime marker missing');
  return source.replace(marker, marker + SCRIPT_TAG);
}

export function patchHrPayrollSw(source) {
  if (source.includes("'./otto-hr-payroll.js'")) return source;
  const marker = "'./otto-persistence.js'";
  if (source.includes(marker)) return source.replace(marker, `${marker}, './otto-hr-payroll.js'`);
  const shell = "'./', './index.html', './landing.html', './guide.html', './manifest.json', './logo.jpg',";
  if (!source.includes(shell)) throw new Error('service worker shell marker missing');
  return source.replace(shell, `${shell} './otto-hr-payroll.js',`);
}

export function validateHrPayroll(index, sw, runtime) {
  return [
    ['runtime is loaded exactly once', (index.match(/data-otto-hr-payroll-runtime/g) || []).length === 1],
    ['runtime loads after field workspace', index.indexOf('data-otto-field-runtime') < index.indexOf('data-otto-hr-payroll-runtime')],
    ['runtime is offline cached', sw.includes("'./otto-hr-payroll.js'")],
    ['workspace route exists', runtime.includes("const VIEW = 'hr_payroll'")),
    ['policy stays on current version 2', runtime.includes('const POLICY_VERSION = 2;')],
    ['English policy exists', runtime.includes("title: 'Employee Accountability Code of Conduct'") && runtime.includes('Accurate timekeeping')],
    ['Spanish policy exists', runtime.includes("title: 'Código de Conducta y Responsabilidad del Empleado'") && runtime.includes('Registro exacto del tiempo')],
    ['workspace reads existing acknowledgments', runtime.includes("data('consent_records')") && runtime.includes("type === 'employee_code_of_conduct'")),
    ['field gate uses the same policy source', runtime.includes("document.getElementById('policy-scroll')") && runtime.includes('scroller.innerHTML = policyHtml(code)')],
    ['desktop HR Payroll tab exists', runtime.includes('data-otto-hr-tab') && runtime.includes("nav(VIEW)")),
    ['mobile More receives HR Payroll shortcut', runtime.includes('data-hr-more-shortcut') && runtime.includes('injectMoreShortcut')),
    ['payroll remains one click away', runtime.includes("nav('payroll')")),
    ['employee records remain one click away', runtime.includes("nav('team')")),
  ];
}

function run() {
  const indexPath = fileURLToPath(INDEX);
  const swPath = fileURLToPath(SW);
  const runtimePath = fileURLToPath(new URL('../otto-hr-payroll.js', import.meta.url));
  const beforeIndex = fs.readFileSync(indexPath, 'utf8');
  const beforeSw = fs.readFileSync(swPath, 'utf8');
  const runtime = fs.readFileSync(runtimePath, 'utf8');
  const afterIndex = patchHrPayrollIndex(beforeIndex);
  const afterSw = patchHrPayrollSw(beforeSw);
  const failed = validateHrPayroll(afterIndex, afterSw, runtime).filter(([, ok]) => !ok);
  if (failed.length) throw new Error(`HR / Payroll patch failed: ${failed.map(([name]) => name).join(', ')}`);
  if (afterIndex !== beforeIndex) fs.writeFileSync(indexPath, afterIndex);
  if (afterSw !== beforeSw) fs.writeFileSync(swPath, afterSw);
  console.log(`HR / Payroll patch: ${afterIndex === beforeIndex && afterSw === beforeSw ? 'already applied' : 'applied'}; validated`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) run();
