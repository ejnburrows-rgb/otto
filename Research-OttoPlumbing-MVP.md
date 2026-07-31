# Deep Research Prompt & Market Analysis: OTTO Plumbing CRM

> **Document Status**: Production Complete
> **Focus Area**: Bilingual Plumbing CRM, Zero-Build Field App Architecture, AI Estimating Integration

---

## 1. Executive Research Summary

### 1.1 Industry Problem Statement
Plumbing companies with 5–25 field workers face high operational friction due to paper-based work orders, language barriers (English management vs. Spanish field crews), manual payment/check tracking, and slow drawing-to-estimate turnaround times. Generic CRMs (ServiceTitan, Housecall Pro) are expensive, overly complex, and lack native single-file offline PWA capability and bilingual voice/OCR support.

### 1.2 Research Objectives
- **Competitive Benchmarking**: Analyze UI/UX patterns and feature sets of ServiceTitan, Housecall Pro, and Jobber to identify gaps for 10–20 person trades crews.
- **Architectural Feasibility**: Evaluate zero-build IndexedDB + Service Worker PWA performance under low-bandwidth jobsite environments.
- **Multimodal AI Integration**: Benchmark Anthropic Claude 3.5 Sonnet (for check/invoice OCR and bilingual assistant queries) and NVIDIA Llama 3.3 70B (for CAD drawing layout analysis).

---

## 2. Technical Architecture & Component Analysis

### 2.1 Storage & Synchronization Engine
- **Local Database**: IndexedDB (`ottoDB`) storing 42 structured collection schema types.
- **Offline Reliability**: ServiceWorker (`sw.js`) caching core app shell (`index.html`, `manifest.json`) guaranteeing 100% offline uptime.
- **Synchronization**: Asynchronous IndexedDB-to-Serverless background sync for cloud backup and team sharing.

### 2.2 Serverless AI Proxies
- **Anthropic Claude Proxy (`api/claude.js`)**: Executes image OCR on paper checks, invoices, and job receipts, pre-filling payments without exposing API credentials to client devices.
- **NVIDIA CAD Proxy (`api/nvidia.js`)**: Parses AutoCAD `.dxf`, `.dwg`, and PDF drawings, extracting title blocks, dimensions, and callouts to draft scope of work and materials lists.

---

## 3. Comparative Matrix: OTTO vs. Legacy Solutions

| Feature Metric | Legacy CRMs (ServiceTitan / Jobber) | OTTO Plumbing CRM |
|---|---|---|
| **Monthly Cost** | $300 – $1,200+ per month | ~$0 – $15 per month |
| **Build Dependency** | Heavy Native Apps / Complex Web Frameworks | Zero-Build Single File PWA (`index.html`) |
| **Bilingual Support** | Basic English-only / Machine Translation | Dual Native English & Spanish Dictionaries |
| **AI Drawing Estimator** | None / Third-party add-ons | Integrated NVIDIA CAD / PDF Estimator |
| **Check / Receipt OCR** | Manual entry required | Built-in Claude Multimodal OCR |
| **QuickBooks Export** | Complex API sync integration | One-tap native CSV export |

---

## 4. Verification & Validation Protocol

- **Static QA Verification**: `node scripts/qa-check.mjs` validates 344 internal functions, 111 inline handlers, and dictionary completeness.
- **Automated Browser Test Suite**: `node scripts/qa-browser.mjs` runs 17 automated end-to-end headless browser tests verifying IndexedDB persistence, job creation, photo uploads, and check scanning.
