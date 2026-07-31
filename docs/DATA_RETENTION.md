# OTTO Plumbing CRM - Data Retention & Collection Policy

This policy explains what data is collected by the OTTO Plumbing CRM application on your device, what happens to it, and how long it is kept.

## 1. What Data is Collected

### Location Data (GPS)
- **When is it collected?** The app records your current GPS location only when you explicitly press the "Check In" or "Clock In" buttons on a job. It does not track your location continuously in the background.
- **Why is it collected?** To verify arrival times at job sites and protect the company and the crew in billing disputes.
- **Who can see it?** Location stamps are added to the Audit Log and Job records. They are visible to the Office Manager and Owner roles.

### Photo Data
- **When is it collected?** When you use the "Take Photo" feature inside a job record. 
- **Why is it collected?** To document before/after conditions, parts used, and job completion for customer invoices and company records.
- **Where is it stored?** Photos are saved securely on your device's local storage (IndexedDB). They are subsequently uploaded over a secure connection (HTTPS) to the company's private cloud storage (Supabase).
- **Who can see it?** Anyone with access to the job record can view the photos. They are never shared publicly or exposed outside the company unless attached to a customer's invoice or estimate.

### Offline & App Data
- **Device Storage:** The application operates offline-first. This means a copy of customer names, addresses, job details, and notes are cached directly on your device.
- **Device Security:** Because sensitive customer data resides on your device, you are required to keep a device lock (PIN, face scan, or fingerprint) active at all times.

## 2. Data Retention & Deletion

- **Cloud Data (Supabase):** Customer records, job history, and photos are retained indefinitely as part of the company's permanent business records.
- **Device Data (IndexedDB):** If you are reassigned or leave the company, your access will be revoked remotely, which prevents further cloud syncs. The local cache on your device can be wiped by clearing the browser's site data.
- **Backups:** Routine backups download all records (including photos) into a consolidated archive. Backups are kept securely by the owner.

## 3. Consent
By logging into the OTTO Plumbing CRM, you consent to the collection and syncing of your job-related location check-ins and job photos as described above. If you have questions about your privacy, please speak with the Owner.
