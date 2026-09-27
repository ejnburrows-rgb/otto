# Cartilla reconstruction reference

Status: active reference for the NBO Command Center.

## Source archive

- File: `creative-pipeline-studio.zip`
- SHA-256: `56c3a96dc968e52e78ba31a3bcba9788757bec2e360590c500fb404b0c72efb9`
- Origin: Lovable Creative Pipeline Studio export supplied by the owner.

## Verified salvageable data

The archive contains:

- `src/data/cartilla_mapping.json`
  - 98 Workbook PDF-sheet records
  - 62 Flip Chart pages
  - 284 total Workbook↔Flip Chart page links
- `src/data/reconstruction-pilot.json`
  - 15 pilot object records
  - pilot Workbook PDF sheets/pages 7, 8, and 10
  - Workbook bounding-box fields
  - Flip Chart crop-box fields
  - reconstruction method/status fields
- pilot Workbook, reference, and reconstructed images
- the Lovable pilot QA plan and implementation code

## Important limitation

Do **not** treat the Lovable Workbook target coordinates or placement coordinates as authoritative.

They were checked against the real Workbook PDF and multiple target boxes land on the wrong object/cell, cross grid boundaries, or miss the intended illustration. Some Flip Chart source crops are clipped as well.

The three exported `reconstructed-page-*.png` pilot files are byte-identical to their original Workbook pilot images, so the archive does not contain a valid finished reconstruction.

Useful data from Lovable may be reused only as candidate/reference information and must be reverified against the real source PDFs.

## Canonical reconstruction path

The authoritative working implementation lives in:

`ejnburrows-rgb/cartilla-de-gretel`

Canonical files:

- `src/data/reconstruction/student-to-flipchart-284.json`
- `src/data/reconstruction/pdf-sheet-to-printed-page.json`
- `src/data/reconstruction/reconstruction-plan.json`
- `src/data/reconstruction/production-manifest.json`
- `scripts/reconstruct-workbook.mjs`
- `scripts/validate-reconstruction-data.mjs`

Workflow:

1. Use the real Workbook PDF as the destination-pixel and geometry authority.
2. Use the authoritative 284-link mapping to restrict valid Flip Chart reference pages.
3. Derive and verify each actual Workbook illustration region from the real source page.
4. If the mapped Flip Chart illustration is geometrically identical, reuse that authentic colored crop directly.
5. If geometry differs, preserve the Workbook drawing and use verified color transfer only.
6. Never use a similar substitute or floating overlay.
7. Keep text, grid lines, labels, page geometry, curriculum, and surrounding artwork unchanged.
8. Generate before/source/after proof.
9. Promote only visually verified PASS pages to the production reconstruction manifest.
10. Run AI color/finish optimization only after deterministic reconstruction passes.

## Current reconstruction truth

- The 284-link page mapping is authoritative.
- The Lovable pilot placement coordinates are not authoritative.
- The deterministic reconstruction engine is the correct master-workbook path.
- The HTML `FaithfulPageRenderer` remains useful for interactive digital lessons but is not the reconstructed master Workbook.
- AI enhancement belongs after geometry-preserving reconstruction, not before it.
