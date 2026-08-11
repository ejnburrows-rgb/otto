# OTTO Unified File Intake — current rule

This file is the authoritative task-specific rule for uploads, imports, OCR, and Plans & AutoCAD.

## One front door

Owner and office users use **Upload / Import** as the common intake surface. OTTO routes the selected file by type and shows a review step before business data is saved.

- `.xlsx`, `.xls`, `.csv` → read structured spreadsheet cells directly; do not OCR spreadsheets. Map employee fields, detect likely existing workers, show a review table, then create/update selected people as **Field Worker only**. Never import PINs. Imported workers may be added to an attendance roster marker, but real attendance remains derived only from real `check_in` / `check_out` events.
- Images/photos → bilingual browser OCR (`eng` + `spa`) using Tesseract.js. The extracted text stays visible/editable for review. It may be copied, saved to a selected job, or deliberately converted into the employee-review flow.
- `.dwg`, `.dxf`, `.dwf`, `.dgn` → require a job, save through OTTO's existing local file/document record flow, then call the existing drawing analysis. Do not create a second CAD storage or estimating pipeline.
- `.pdf` → ask one simple routing question because PDF is ambiguous: **Read text / scanned document** or **Plan / drawing**. Do not guess silently.

## UX rule

The owner should only need to think: **Give OTTO the file → review what OTTO read → confirm → save.** Contextual shortcuts such as Plans & AutoCAD may open the same unified intake with the job preselected, but they must not launch a competing uploader.

## Retired behavior

Do not restore a separate provider-key/Claude OCR workflow as the normal upload experience. Do not expose multiple competing Scan / OCR / CAD upload buttons when the unified intake can handle the file. Old handoff documents describing that process are historical in Git and are not active instructions.

## Data truth

Never fabricate OCR certainty, employee roles, attendance, job assignment, or drawing results. A user reviews extracted/imported data before saving. Spreadsheet imports cannot grant owner/office access.
