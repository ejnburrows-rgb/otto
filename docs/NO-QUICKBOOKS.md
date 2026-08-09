# QuickBooks is out of scope

Decision: OTTO does **not** connect to QuickBooks and does not need Intuit API credentials.

Keep:
- OTTO native invoices and payments;
- generic CSV export;
- payroll file upload/import;
- jobs, customers, documents, reports, Inbox, and Ask OTTO.

Do not reintroduce without an explicit new requirement:
- `/api/quickbooks`;
- Intuit OAuth or QuickBooks credentials;
- QuickBooks connect/status UI;
- QuickBooks-specific export buttons or payment methods;
- QuickBooks-specific tests or deployment requirements.

This decision was implemented in PR #106 on 2026-08-09.
