// Shared fail-closed gate for sensitive server endpoints.
//
// WHY THIS EXISTS: api/data.js, api/photos.js, api/claude.js, api/nvidia.js,
// api/notify.js, and the QuickBooks sync action in api/quickbooks.js all run
// with a secret server-side key (Supabase service-role, Anthropic, NVIDIA,
// Twilio/SendGrid, QuickBooks) but have no server-side check of who is
// calling. Anyone who can reach the URL can currently read or write real
// customer data, pull signed photo links, spend AI credit, or send customer
// notifications.
//
// A real fix needs a real server-side identity/session system with
// authorization by role — that has not been selected or built yet (see
// docs/STATUS.md, "MISSING FOR LAUNCH"). AGENTS.md also forbids hand-building
// one. Until the real thing exists, this module is a closed gate, not a
// login system: every sensitive route refuses every request and does it
// before touching Supabase/Anthropic/NVIDIA/Twilio/SendGrid/QuickBooks, so no
// request reaches those services and no response ever carries customer data,
// signed URLs, provider replies, or message previews.
//
// To reopen a route once real auth ships, replace `hasServerAuth`'s `false`
// with the real check (e.g. verifying a session token issued by that
// system) — nothing else about the route needs to change.

export function hasServerAuth(_req) {
  // TODO: Implement real session checking here.
  // This must verify the caller has a valid, server-side session cookie or token,
  // and that the user behind that session has the required role (e.g. 'owner' or 'office').
  // Do NOT rely on the client passing `{ role: 'owner' }` in the body.
  return false;
}

export function denyUnauthenticated(res) {
  res.status(403).json({
    error: 'server_auth_not_configured',
    message: 'This server route is disabled until real server-side sign-in is built. No data was read or changed.',
  });
}
