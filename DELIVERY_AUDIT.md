# OTTO Plumbing CRM - Delivery Audit

**Audit Date:** 2025-07-18  
**Commit SHA:** f0baa75  
**Live URL:** dream-cooling-crm.vercel.app (DEPLOYMENT_NOT_FOUND - requires redeployment)  
**Local Test URL:** http://localhost:8080/index.html (PASS - returns 200)

---

## Feature Status Table

| Feature | Code Exists | Works Locally | Works in Production | Persists Across Devices | Evidence | Status |
|---------|-------------|---------------|---------------------|------------------------|----------|---------|
| Bilingual English/Spanish toggle | ✅ Yes | ✅ Yes | ⚠️ Unverified | N/A | Lines 581, 752, 648-743 | **PASS** |
| Login/PIN flow | ✅ Yes | ✅ Yes | ⚠️ Unverified | ❌ No (localStorage) | Lines 1146-1169, seeded users 776-794 | **DEMO ONLY** |
| Role-based experience | ✅ Yes | ✅ Yes | ⚠️ Unverified | ❌ No (localStorage) | Lines 1096-1101, 1191, 1287 | **DEMO ONLY** |
| Customer CRM and job records | ✅ Yes | ✅ Yes | ⚠️ Unverified | ⚠️ Optional Firebase | Lines 870-1015 IndexedDB+Firebase | **DEMO ONLY** |
| Job assignment and status updates | ✅ Yes | ✅ Yes | ⚠️ Unverified | ❌ No (localStorage) | Lines 1505-1527, 1418 | **DEMO ONLY** |
| Worker mobile workflow | ✅ Yes | ✅ Yes | ⚠️ Unverified | ❌ No (localStorage) | Lines 1291-1292, field role nav | **DEMO ONLY** |
| Photo/document upload | ✅ Yes | ✅ Yes | ⚠️ Unverified | ❌ No (localStorage) | Lines 1683, 2455+ | **DEMO ONLY** |
| Notes/checklists and worker activity | ✅ Yes | ✅ Yes | ⚠️ Unverified | ❌ No (localStorage) | Lines 3423, audit trail | **DEMO ONLY** |
| Owner/office dashboard | ✅ Yes | ✅ Yes | ⚠️ Unverified | ❌ No (localStorage) | Lines 1287, 1345, hub views | **DEMO ONLY** |
| Audit/activity history | ✅ Yes | ✅ Yes | ⚠️ Unverified | ❌ No (localStorage) | audit() calls throughout | **DEMO ONLY** |
| AI assistant (Anthropic) | ✅ Yes | ⚠️ Requires API key | ⚠️ Requires Vercel env | N/A | api/claude.js, line 2133 | **BLOCKED** |
| AI drawing estimator (NVIDIA) | ✅ Yes | ⚠️ Requires API key | ⚠️ Requires Vercel env | N/A | api/nvidia.js, lines 2440-2542 | **BLOCKED** |
| PWA installability | ✅ Yes | ✅ Yes | ⚠️ Unverified | N/A | manifest.json, sw.js | **PASS** |
| Responsive mobile layout | ✅ Yes | ✅ Yes | ⚠️ Unverified | N/A | CSS tokens, viewport meta | **PASS** |
| Cloud sync (Firebase) | ✅ Yes | ⚠️ Requires config | ⚠️ Requires deployment | ✅ Yes if configured | Lines 960-1015 | **CONFIG REQUIRED** |
| SMS notifications (Twilio) | ✅ Yes | ⚠️ Requires env | ⚠️ Requires Vercel env | N/A | api/notify.js | **CONFIG REQUIRED** |
| Email notifications (SendGrid) | ✅ Yes | ⚠️ Requires env | ⚠️ Requires Vercel env | N/A | api/notify.js | **CONFIG REQUIRED** |
| QuickBooks integration | ✅ Yes | ⚠️ Stub only | ⚠️ Requires Vercel env | N/A | api/quickbooks.js | **STUB** |
| Inbound email webhook | ✅ Yes | ⚠️ Requires env | ⚠️ Requires Vercel env | N/A | api/inbound-email.js | **CONFIG REQUIRED** |

---

## Critical Findings

### P0 Blockers
1. **Production deployment not found** - `dream-cooling-crm.vercel.app` returns DEPLOYMENT_NOT_FOUND
2. **Hardcoded Firebase API key exposed** - Line 960: `AIzaSyBcOfUbUfFc7PBkKUNAALIEtTO7YCznjH4` (client-side)
3. **All data persistence is localStorage/IndexedDB only** - No cloud sync without manual Firebase configuration
4. **Worker role isolation untested** - Cannot verify workers cannot see other workers' data without backend testing

### P1 Issues
1. **API routes require environment variables** - All ai/notify/quickbooks/inbound-email APIs return 503 without Vercel env vars
2. **No automated tests passing** - QA scripts reference wrong path (`D:/Projects/otto-fresh`)
3. **Service worker cache versioning** - May serve stale builds after deploy (sw.js uses 'otto-crm-v2')

### P2 Observations
1. Seed users use generic names (Alex Rivera, Sofia Patel) instead of stated Julio/Otto/Sarays
2. Default PINs are documented as 1234 in README but actual seed data uses varied PINs (0715-0733)

---

## Data Persistence Analysis

**Current State:** DEMO/LOCAL ONLY
- Primary storage: IndexedDB (lines 870-935)
- Backup: localStorage (line 927)
- Optional cloud: Firebase Firestore (lines 960-1015) - REQUIRES MANUAL CONFIGURATION
- Cross-device sync: ONLY works if user manually enters Firebase credentials in Settings

**Evidence:**
```javascript
// Line 960 - hardcoded fallback with exposed key
function fbConfig() { 
  try { 
    const s = JSON.parse(localStorage.getItem('otto_fb') || 'null'); 
    if (s && s.projectId && s.apiKey) return s; 
  } catch (e) { } 
  return { projectId: 'otto-crm-7f951', apiKey: 'AIzaSyBcOfUbUfFc7PBkKUNAALIEtTO7YCznjH4' }; 
}
```

---

## API Integration Status

| API Route | Env Var Required | Returns Safe Error | Tested | Status |
|-----------|------------------|-------------------|---------|---------|
| POST /api/claude | ANTHROPIC_API_KEY | ✅ 503 no_server_key | ❌ No | CONFIG REQUIRED |
| POST /api/nvidia | NVIDIA_API_KEY | ✅ 503 no_server_key | ❌ No | CONFIG REQUIRED |
| POST /api/notify | TWILIO_*, SENDGRID_* | ✅ 503 not_configured | ❌ No | CONFIG REQUIRED |
| POST /api/inbound-email | FIREBASE_*, WEBHOOK_SECRET | ✅ 503 not_configured | ❌ No | CONFIG REQUIRED |
| GET/POST /api/quickbooks | QB_CLIENT_ID, QB_CLIENT_SECRET | ✅ 503 not_configured | ❌ No | STUB ONLY |

All API routes properly return user-friendly errors when keys are missing. ✅

---

## Security Findings

1. **Firebase API key hardcoded in client code** (Line 960)
   - Risk: Low (Firestore rules would limit access, but rules not verified)
   - Action: Remove hardcoded key, require manual configuration only

2. **No MFA enforcement** - Optional MFA PIN for owner (line 3881) but not enforced
   - Status: As-designed for demo, document limitation

3. **Session stored in localStorage** (line 1152)
   - Risk: Medium for production, acceptable for demo
   - Document: Session not secure, device-specific only

---

## Files Requiring Updates

1. `index.html` line 960 - Remove hardcoded Firebase key
2. `scripts/qa-check.mjs` line 5 - Fix path from `D:/Projects/otto-fresh` to `/workspace`
3. Deploy to Vercel to restore production URL

---

## Summary

**Overall Status:** DEMO READY, PRODUCTION BLOCKED

**What Works:**
- ✅ Full UI renders locally
- ✅ Bilingual toggle functional
- ✅ Login/PIN flow with role-based navigation
- ✅ All CRUD operations for customers/jobs (localStorage)
- ✅ PWA manifest and service worker present
- ✅ Mobile-responsive CSS

**What Requires Configuration:**
- ⚠️ Firebase cloud sync (user must enter credentials in Settings)
- ⚠️ AI features (Anthropic/NVIDIA API keys in Vercel)
- ⚠️ SMS/Email notifications (Twilio/SendGrid in Vercel)
- ⚠️ QuickBooks integration (OAuth credentials in Vercel)
- ⚠️ Inbound email webhook (Firebase + secret in Vercel)

**What's Broken:**
- ❌ Production deployment not found on Vercel
- ❌ Hardcoded Firebase key should be removed
- ❌ QA scripts reference wrong file paths

---

**Recommendation:** Ship as "Demo/Local Only" with clear documentation that cloud sync and AI features require one-time configuration by Emilio/client. Do NOT claim production-ready until Vercel deployment is restored and environment variables are configured.
