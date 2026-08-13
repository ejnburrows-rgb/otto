# Ask OTTO implementation — 2026-08-13

This release turns Ask OTTO into one restrained, results-first command surface for the four protected administrator profiles: EJN (`it-admin-ejn`), Otto (`owner-1`), Julio (`owner-2`), and Sarays (`ops-1`).

Ask OTTO searches only paystubs, contracts, emails, notes, payroll, schedules, and employee records. It shows results before opening them, carries current screen context into searches, works from local CRM records when offline, and uses Claude only as an optional drafting/reasoning layer.

Changes that modify CRM records are proposed before they are applied. Paystub values come from existing payroll records; AI does not invent payroll amounts. Supported creation/change intents include notes, email drafts, contracts, paystubs, payroll summaries, schedule changes, and restricted employee-record updates.

The assistant uses one small wrench launcher. The older duplicate Ask OTTO/chat surfaces are hidden when this command assistant is available. No voice feature is included.

The existing three-window owner/office workspace remains unchanged. Julio and Sarays retain their approved wallpaper assets without alteration; their existing green/pink accent identities continue to flow into the assistant automatically. Otto/EJN use the OTTO blue identity.

The assistant runtime and stylesheet are added to the existing service-worker shell cache. Search, preview, and deterministic record/template operations use local CRM state. Provider-backed drafting remains online-only and falls back cleanly when unavailable.
