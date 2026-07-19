# SPEC vs REALITY: GAP REPORT

This report evaluates each module outlined in `SPEC.md` against the actual implementation in `index.html`.

## Module Verification

*   **Customers**: DONE. Verified via the `viewCustomers()` function and UI in `index.html`.
*   **Jobs**: DONE. Verified via `viewJobs()` function and UI in `index.html`.
*   **Estimates**: DONE. Verified via `viewEstimates()` function and UI in `index.html`.
*   **Invoices**: DONE. Verified via `viewInvoices()` function and UI in `index.html`.
*   **Payments**: DONE. Verified via `viewPayments()` function and UI in `index.html`.
*   **Payroll**: DONE. Verified via `viewPayroll()` function and UI in `index.html`.
*   **Scheduling**: DONE. Verified via `viewJobs()` and `renderScheduleStrip()` which show scheduled jobs on specific dates.
*   **Documents**: DONE. Verified via `viewDocuments()` / the Documents tab inside the Job view.
*   **Ask OTTO chatbot**: DONE. Verified via `viewAssistant()` which renders the AI chat interface.
*   **OCR**: DONE. Verified via `photoScanCreateCustomer()` and `ocrCheck()` functions leveraging AI vision API.
*   **NVIDIA floor-plan estimator**: DONE. Verified via the `analyzePdfAI()` function calling the `nvidia/llama-3.1-nemotron-nano-vl-8b-v1` model in `index.html`.
*   **Worker Portal**: PARTIAL. Verified via the PIN login targeting a `field` role which restricts access (e.g. `window.__pick('field-1')`) and UI element `renderScheduleStrip()`. However, the "2-Week" and "4-Week" schedule buttons are dummy buttons lacking functionality/click handlers.
*   **KPI dashboard**: DONE. Verified via `viewKpis()` function and KPI charts rendering in the owner view.
*   **Worker check-in/out with photos/GPS**: DONE. Verified via `doCheckIn()`, `doCheckOut()` and GPS logging functions inside `index.html`.
*   **QuickBooks export**: DONE. Verified via the `exportQuickBooks(kind)` function generating CSVs in the required format.
*   **Email inbox capture**: PARTIAL. Verified via the `connectGmail()`, `fetchNewEmails()`, and `viewInbox()` functions connecting to the Gmail API. However, it uses 60-second polling (`setInterval`) rather than the specified real-time push notifications.

## Finish List

1. **Worker Portal Schedule Views (Small)**: Wire up the 2-Week and 4-Week buttons to actually expand the schedule range.
2. **Email Push Notifications (Medium)**: Replace the `setInterval` polling with real-time push notifications using the Gmail API / Cloud Pub/Sub integration.

## Final Screenshots

*   Working Module (KPI Dashboard):
    ![Working Module: KPI Dashboard](../kpi_dashboard.png)
*   Working Module (Jobs View):
    ![Working Module: Jobs View](../jobs_view.png)
*   Partial Module (Worker Portal with non-functional schedule buttons):
    ![Partial Module: Worker Portal](../worker_portal.png)
