// The cloud sync merge rules, kept in one small file so they can be tested
// without a browser or a database (see scripts/test-merge.mjs).
//
// index.html contains a copy of these three functions. They must stay identical.
// If you change a rule here, change it there too — and vice versa.
//
// The rules, in plain language:
//   - When the same record exists in two places, the more recently edited one wins.
//   - A record that exists in only one place is kept, never dropped.
//   - Deleting marks a record deleted instead of removing it, so an accidental
//     delete is recoverable and a delete cannot be undone by a phone that was
//     offline when it happened.

/** When did this record last change? Missing means "as old as possible", so a
 *  record that has never been stamped always loses to one that has. */
function timeOf(record) {
  const t = record && record.updated;
  const ms = t ? Date.parse(t) : NaN;
  return isNaN(ms) ? -Infinity : ms;
}

/** Pick the winning version of a single record. */
export function mergeRecords(local, incoming) {
  if (!local) return incoming;
  if (!incoming) return local;
  // Strictly newer wins. On an exact tie we keep the local copy rather than
  // silently discarding the person's own work.
  return timeOf(incoming) > timeOf(local) ? incoming : local;
}

/** Merge two lists of records by id.
 *
 *  `incoming` of null/undefined means the server could not read this collection.
 *  That is NOT the same as the collection being empty: we keep what the device
 *  already has, because replacing good records with nothing over a temporary
 *  network problem destroys data. */
export function mergeCollections(local, incoming) {
  const localList = Array.isArray(local) ? local : [];
  if (!Array.isArray(incoming)) return localList;

  const byId = new Map();
  for (const record of localList) {
    if (record && record.id) byId.set(record.id, record);
  }
  for (const record of incoming) {
    if (!record || !record.id) continue;
    byId.set(record.id, mergeRecords(byId.get(record.id), record));
  }
  return [...byId.values()];
}

/** Should this record be shown anywhere in the app — lists, counts, reports,
 *  exports? A soft-deleted record must look gone to anyone using the app. */
export function isVisible(record) {
  return !(record && record.deleted === true);
}
