# OTTO QA Report

**Run:** 2026-08-14T13:52:14.422Z
**Overall:** PASS (with notes below)

## Button wiring
- Functions in app: 429
- Buttons checked: 128
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
- QuickBooks removed from local build: false
- Notify API responds: 401

## JSON
```json
{
  "ts": "2026-08-14T13:52:14.422Z",
  "functions": 429,
  "onclickCalls": 128,
  "missingHandlers": [],
  "notOnWindowExport": [],
  "missingSpanishKeys": [],
  "missingSpanishCount": 0,
  "collections": 41,
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
  "apiNotify": 401,
  "quickBooksRemovedFromBuild": false,
  "pass": true
}
```