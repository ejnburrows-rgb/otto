import { requireCaller } from './_lib/serverAuth.js';

export default async function handler(req, res) {
  const caller = await requireCaller(req, res);
  if (!caller) return;
  res.status(200).json({ id: caller.id, name: caller.name, role: caller.role });
}
