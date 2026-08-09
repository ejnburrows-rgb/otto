// Shared fail-closed gate for sensitive server endpoints.
//
// WHY THIS EXISTS: api/data.js, api/photos.js, api/claude.js, api/nvidia.js,
// and api/notify.js run with secret server-side keys (Supabase service-role,
// Anthropic, NVIDIA, Twilio/SendGrid) but have no server-side check of who is
// calling. Anyone who can reach the URL could otherwise read or change real
// customer data, pull signed photo links, spend AI credit, or send customer
// notifications.
//
// A real fix needs a real server-side identity/session system with
// authorization by role — that has not been selected or built yet (see
// docs/STATUS.md, "MISSING FOR LAUNCH"). AGENTS.md also forbids hand-building
// one. Until the real thing exists, this module is a closed gate, not a
// login system: every sensitive route refuses every request and does it
// before touching Supabase/Anthropic/NVIDIA/Twilio/SendGrid, so no request
// reaches those services and no response ever carries customer data, signed
// URLs, provider replies, or message previews.
//
// ---------------------------------------------------------------------------
// 2026-07-31 — RESTORED after a live authentication bypass. Read this before
// changing anything below.
//
// This gate was replaced with hand-rolled JWT verification whose signing secret
// fell back to a hardcoded development placeholder committed to this
// repository. That alone let anyone forge a token. Worse, the companion route
// api/login.js issued a session by taking `userId` and `role` straight from the
// request body, and returned the SMS code inside the very token it handed the
// caller — a JWT payload is base64, not encrypted — so any caller could read
// the code back out and mint themselves an owner session with no PIN, no SMS
// and no credential of any kind. That token then satisfied this function and
// unlocked the Supabase service-role key.
//
// Both are gone. api/login.js is deleted. If you are reintroducing sign-in: do
// not hand-build it, do not sign your own tokens, and do not add a development
// fallback secret. Use the provider's own verification, and replace the `false`
// below with that check — nothing else about any route needs to change.
// scripts/test-server-auth.mjs enforces both rules and fails the build if they
// are broken again.
// ---------------------------------------------------------------------------

export function hasServerAuth(_req) {
  return false; // no real server-side identity/session system exists yet
}

export function denyUnauthenticated(res) {
  res.status(403).json({
    error: 'server_auth_not_configured',
    message: 'This server route is disabled until real server-side sign-in is built. No data was read or changed.',
  });
}
