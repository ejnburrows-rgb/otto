import fs from 'node:fs';
import { patchUnifiedIntake, validateUnifiedIntake } from './apply-unified-intake-patch.mjs';

let passed = 0, failed = 0;
function check(name, ok) { if (ok) { passed++; console.log(`✓ ${name}`); } else { failed++; console.error(`✗ ${name}`); } }

const runtime = fs.readFileSync(new URL('../otto-unified-intake.js', import.meta.url), 'utf8');
const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const patched = patchUnifiedIntake(index);

for (const [name, ok] of validateUnifiedIntake(patched)) check(name, ok);
check('single Upload / Import front door exists', runtime.includes("tx('Upload / Import','Subir / Importar')"));
check('spreadsheet routes to structured parser', runtime.includes("['xlsx','xls','csv'].includes(x)") && runtime.includes('readRows(file)'));
check('CSV parser is direct and does not use OCR', runtime.includes('function parseCSV') && runtime.includes("ext(file) === 'csv'"));
check('Excel reader uses worksheet cells', runtime.includes('XLSX.utils.sheet_to_json'));
check('images route to OCR', runtime.includes("file.type.startsWith('image/')") && runtime.includes('runOCR(file, jobId)'));
check('OCR worker loads English and Spanish', runtime.includes("createWorker(['eng','spa']"));
check('PDF ambiguity is explicit', runtime.includes("What kind of PDF is this?") && runtime.includes('data-pdf-ocr') && runtime.includes('data-pdf-plan'));
check('CAD extensions route to existing plan path', runtime.includes("['dwg','dxf','dwf','dgn'].includes(x)") && runtime.includes('saveAsPlan(file, jobId)'));
check('plans require a job', runtime.includes("Plans must stay attached to the correct job."));
check('Plans hub exposes a dedicated PDF and AutoCAD intake', runtime.includes('openPlan: openPlanIntake') && runtime.includes('Import PDF / AutoCAD') && runtime.includes('accept=".pdf,.dwg,.dxf,.dwf,.dgn,application/pdf"'));
check('plan intake can create the required job without leaving the upload', runtime.includes('data-plan-create') && runtime.includes("b.add('jobs'") && runtime.includes('Create job & import'));
check('plans reuse existing analyzeDrawing', runtime.includes('await b.analyzeDrawing(rec.id)'));
check('employee review happens before save', runtime.includes('Review employees') && runtime.includes('Save selected employees'));
check('employee role is fixed to field', runtime.includes("role: 'field'"));
check('PIN fields are not imported', !runtime.includes('pin:') && runtime.includes('PINs are never imported'));
check('attendance roster does not fabricate check-ins', runtime.includes("type:'attendance_roster'") && !runtime.includes("type:'check_in'"));
check('OCR review can feed employee review', runtime.includes('Use as employee list') && runtime.includes('reviewEmployees(rows,file.name)'));
check('OCR output remains reviewable before saving', runtime.includes('Extracted text') && runtime.includes('Review the text before saving or importing.'));

console.log(`\nUnified intake: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
