# Technical Design Document: OTTO Plumbing CRM (MVP)

> **Document Status**: Final Production Specifications
> **Target Audience**: Vibe-coders & Non-technical operators
> **Target Platform**: Progressive Web App (PWA) — Web, iOS, Android (Offline-ready)

---

## 1. Executive Summary & Recommended Approach

OTTO Plumbing CRM is built as a single-file, zero-build Progressive Web App (`index.html`) using Vanilla HTML5, CSS Variables, and JavaScript (ES2022+). It requires no local build step (no Vite, React, or Webpack) and relies on browser-native APIs (IndexedDB, SpeechRecognition, ServiceWorker) backed by lightweight serverless proxies (`api/claude.js` and `api/nvidia.js`) for AI capability.

| Technology Dimension | Selected Approach | Alternatives Evaluated | Rationale |
|---|---|---|---|
| **Architecture** | Zero-build Single-Page PWA | React / Next.js SSR | Eliminates build friction, zero node module bloat on client, instant offline PWA load. |
| **Persistence** | Local IndexedDB + Mirroring | Pure Cloud Database | Guarantees instant field performance in weak-signal basements/jobsites. |
| **Backend/Serverless** | Vercel Serverless Functions | Dedicated Node.js Express Server | $0 maintenance cost, automatic scaling, secures API keys away from browser. |
| **AI Integration** | Anthropic Claude API + NVIDIA API | Direct Client API Calls | Serverless proxy keeps API keys safe while allowing multimodal OCR and CAD parsing. |

---

## 2. Project Setup Checklist

- [x] **Repository Root**: `c:\Users\EJN\Desktop\Otto Plumbing\otto`
- [x] **Entry Point**: `index.html` (HTML + CSS + Application Logic + Translation Dictionaries)
- [x] **Offline Cache Shell**: `sw.js` + `manifest.json`
- [x] **Static Verification**: `node scripts/qa-check.mjs`
- [x] **Browser QA Suite**: `node scripts/qa-browser.mjs`
- [x] **Environment Variables**: `ANTHROPIC_API_KEY`, `NVIDIA_API_KEY`, `NVIDIA_MODEL`

---

## 3. Feature Implementation Guide

### 3.1 Dual-Language Toggle (EN / ES)
- **Implementation**: In-memory translation dictionaries (`EN` and `ES`) with native plumbing terms.
- **UI Mechanism**: Top-bar toggle switch + user profile default configuration stored in `localStorage`.

### 3.2 Offline Job & Record Management
- **Implementation**: Asynchronous IndexedDB storage engine (`ottoDB`) wrapping Customers, Jobs, Calls, Notes, Estimates, Invoices, Checks, and SOPs.
- **Fallbacks**: Synchronous `localStorage` mirroring for critical user settings and session state.

### 3.3 Multi-Modal AI (Voice, OCR, Drawing Parsing)
- **Voice-to-Text**: Browser-native `window.webkitSpeechRecognition` with auto-language detection.
- **Check/Invoice OCR**: `api/claude.js` endpoint receiving base64 images and extracting structured payment/invoice fields.
- **AutoCAD / PDF Estimator**: `api/nvidia.js` endpoint receiving CAD files (`.dwg .dxf`) or PDFs to generate scope & materials list.

---

## 4. Data Storage & Schema Design

```
IndexedDB: ottoDB
├── customers (id, name, phone, address, language, createdAt)
├── jobs (id, customerId, status, address, description, photos[], docs[])
├── calls (id, customerId, timestamp, duration, notes, status)
├── money (id, type, amount, status, invoiceId, checkImage)
├── sops (id, title, category, contentEn, contentEs)
└── audit (id, timestamp, userId, action, payload)
```

---

## 5. AI Assistance Strategy & Tool Directives

- **Claude Code**: Terminal-driven development agent executing QA verification (`node scripts/qa-check.mjs`).
- **Cursor / Windsurf**: IDE inline completion respecting `AGENTS.md` and `.cursorrules`.

---

## 6. Deployment & Cost Breakdown

- **Hosting**: Vercel Static & Serverless ($0 / month tier).
- **AI Token Expenses**: Anthropic Claude + NVIDIA API (~$5–$15 / month based on crew activity).
- **Total Monthly Cost**: ~$0 – $15 / month.
