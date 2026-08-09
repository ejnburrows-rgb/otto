// "Who am I?" — answered by the server, because only the server can say.
//
// A crew member's identity is readable from their sign-in link (field-3@otto.local
// names their app id). An owner signs in with their real email address, which
// says nothing about which staff row they are — the binding lives in the
// database. So the app asks here rather than guessing, and the answer comes from
// the same gate every other route uses.
//
// This returns the caller's own id, name and role and nothing else. It is not a
// user directory: it cannot be asked about anybody but the caller.

import { requireCaller } from './_lib/serverAuth.js';

export default async function handler(req, res) {
  const caller = await requireCaller(req, res);
  if (!caller) return;
  res.status(200).json({ id: caller.id, name: caller.name, role: caller.role });
}
