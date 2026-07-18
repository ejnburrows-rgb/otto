# OTTO QA Report

**Run:** 2026-07-17T20:31:35.591Z
**Overall:** ISSUES FOUND

## Button wiring
- Functions in app: 342
- Buttons checked: 114
- Broken buttons: NONE
- New features not on window export list: NONE (browser still OK)

## Spanish labels
- Missing Spanish translations: 0

## Data storage
- employee_messages collection: YES

## Live checks
- prod: OK 200
- local: OK 200
- guide: OK 308
- manifest: FAIL 404
- sw: FAIL 404
- Production has urgent hub: false
- Production has photo customer: false
- Production dark default: true
- QuickBooks API responds: 404
- Notify API responds: 404

## JSON
```json
{
  "ts": "2026-07-17T20:31:35.591Z",
  "functions": 342,
  "onclickCalls": 114,
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
      "status": 308,
      "ok": true
    },
    "manifest": {
      "status": 404,
      "ok": false
    },
    "sw": {
      "status": 404,
      "ok": false
    }
  },
  "prodHasUrgent": false,
  "prodHasPhoto": false,
  "prodDarkDefault": true,
  "apiQuickbooks": 404,
  "apiNotify": 404,
  "pass": false
}
```