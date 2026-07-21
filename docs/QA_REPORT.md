# OTTO QA Report

**Run:** 2026-07-21T15:26:36.298Z
**Overall:** PASS (with notes below)

## Button wiring
- Functions in app: 373
- Buttons checked: 116
- Broken buttons: NONE
- New features not on window export list: NONE (browser still OK)

## Spanish labels
- Missing Spanish translations: 0

## Data storage
- employee_messages collection: YES

## Live checks
- prod: OK 200
- local: OK 200
- guide: OK 200
- manifest: OK 200
- sw: OK 200
- Production has urgent hub: true
- Production has photo customer: true
- Production dark default: true
- QuickBooks API responds: 200
- Notify API responds: 503

## JSON
```json
{
  "ts": "2026-07-21T15:26:36.298Z",
  "functions": 373,
  "onclickCalls": 116,
  "missingHandlers": [],
  "notOnWindowExport": [],
  "missingSpanishKeys": [],
  "missingSpanishCount": 0,
  "collections": 42,
  "hasEmployeeMessages": true,
  "urls": {
    "prod": {
      "status": 200,
      "ok": true
    },
    "local": {
      "status": 200,
      "ok": true
    },
    "guide": {
      "status": 200,
      "ok": true
    },
    "manifest": {
      "status": 200,
      "ok": true
    },
    "sw": {
      "status": 200,
      "ok": true
    }
  },
  "prodHasUrgent": true,
  "prodHasPhoto": true,
  "prodDarkDefault": true,
  "apiQuickbooks": 200,
  "apiNotify": 503,
  "pass": true
}
```