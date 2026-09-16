import fs from 'node:fs';
import { patchUnifiedIntake, patchUnifiedRuntime, validateUnifiedIntake } from './apply-unified-intake-patch.mjs';

let passed = 0, failed = 0;
function check(name, ok) { if (ok) { passed++; console.log(`✓ ${name}`); } else { failed++; console.error(`✗ ${name}`); } }

const runtimeSource = fs.readFileSync(new URL('../otto-unified-intake.js', import.meta.url), 'utf8');
const runtime = patchUnifiedRuntime(runtimeSource);
const plus = fs.readFileSync(new URL('../otto-file-intake-plus.js', import.meta.url), 'utf8');
const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const patched = patchUnifiedIntake(index);

for (const [name, ok] of validateUnifiedIntake(patched, runtime)) check(name, ok);
check('single Upload / Import front door exists', runtime.includes("tx('Upload / Import','Subir / Importar')"));
check('spreadsheet routes to structured parser', runtime.includes("['xlsx','xls','csv'].includes(x)") && runtime.includes('readRows(file)'));
check('CSV parser is direct and does not use OCR', runtime.includes('function parseCSV') && runtime.includes("ext(file) === 'csv'"));
check('Excel reader uses worksheet cells', runtime.includes('XLSX.utils.sheet_to_json'));
check('images keep bilingual OCR fallback', runtime.includes("file.type.startsWith('image/')") && runtime.includes('runOCR(file, jobId)'));
check('images prefer broad searchable intake', runtime.includes('window.ottoFileIntakePlus.handleGeneric(file, jobId)'));
check('OCR worker loads English and Spanish', runtime.includes("createWorker(['eng','spa']"));
check('PDF ambiguity is explicit', runtime.includes("What kind of PDF is this?") && runtime.includes('data-pdf-ocr') && runtime.includes('data-pdf-plan'));
check('PDF document choice prefers broad searchable intake', runtime.includes('window.ottoFileIntakePlus.handleGeneric(file, job)'));
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

check('broad picker includes requested text formats', plus.includes('.md') && plus.includes('.csv') && plus.includes('.json') && plus.includes('.txt'));
check('broad picker includes Office formats', plus.includes('.docx') && plus.includes('.xlsx') && plus.includes('.pptx'));
check('broad picker includes PDF and images', plus.includes('.pdf') && plus.includes('image/*'));
check('unsafe executable/script formats stay blocked', plus.includes("'exe'") && plus.includes("'js'") && plus.includes("'ps1'") && plus.includes("'zip'"));
check('blocked and oversized files cannot expose a save button', plus.includes("renderReview(file, '', 'blocked'") && plus.includes('false);') && plus.includes("const saveButton = $('[data-file-plus-save]', overlay)"));
check('files remain capped at 25 MB', plus.includes('25 * 1024 * 1024'));
check('text-native files are read directly', plus.includes('await file.text()'));
check('DOCX/PPTX text extraction uses zipped Office XML', plus.includes('JSZip.loadAsync') && plus.includes("x === 'docx'") && plus.includes("x === 'pptx'"));
check('spreadsheet document extraction uses SheetJS', plus.includes('XLSX.utils.sheet_to_csv'));
check('PDF reads native text before OCR fallback', plus.includes('getTextContent()') && plus.includes('extractOCRText(file)'));
check('generic image extraction reuses bilingual OCR', plus.includes("file.type.startsWith('image/')") && plus.includes('extractOCRText(file)'));
check('HEIC and HEIF can still be stored if browser OCR cannot decode them', plus.includes("'heic','heif'") && plus.includes('The file will still save'));
check('extracted text is persisted on document records', plus.includes('extractedText: searchable') && plus.includes('ocr: searchable'));
check('extraction status is persisted honestly', plus.includes("extractionStatus: searchable ? 'complete' : 'stored_only'"));
check('spreadsheet can be imported or stored as searchable document', plus.includes('Import employee data') && plus.includes('Save/read as a document'));
check('broad file intake is wired into the same front door', patched.includes('data-otto-file-intake-plus'));

console.log(`\nUnified intake: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);