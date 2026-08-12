# OTTO QA Report

**Run:** 2026-08-11T20:11:23.668Z
**Overall:** PASS (with notes below)

## Button wiring
- Functions in app: 428
- Buttons checked: 135
- Broken buttons: NONE
- New features not on window export list: NONE (browser still OK)

## Spanish labels
- Missing Spanish translations: 0

## Data storage
- employee_messages collection: YES

## Live checks
- prod: OK 200
- local: FAIL 0
- guide: OK 200
- manifest: OK 200
- sw: OK 200
- Production has urgent hub: true
- Production has photo customer: true
- Production dark default: true
- QuickBooks removed from local build: false
- Notify API responds: 403

## JSON
```json
{
  "ts": "2026-08-11T20:11:23.668Z",
  "functions": 426,
  "onclickCalls": 134,
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
      "status": 0,
      "ok": false,
      "error": ""
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
  "apiNotify": 403,
  "quickBooksRemovedFromBuild": false,
  "pass": true
}
```
