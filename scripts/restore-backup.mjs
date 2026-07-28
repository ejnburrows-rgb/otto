import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be in .env');
  process.exit(1);
}

const backupFile = process.argv[2];
const isDryRun = process.argv.includes('--dry-run');

if (!backupFile) {
  console.error('Usage: node restore-backup.mjs <backup.json> [--dry-run]');
  process.exit(1);
}

try {
  const data = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
  console.log(`Loaded backup with ${Object.keys(data).length} collections.`);
  
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json'
  };

  for (const [collection, records] of Object.entries(data)) {
    if (!Array.isArray(records)) continue;
    
    console.log(`Restoring ${records.length} records to '${collection}'...`);
    const rows = records
      .filter(rec => rec && rec.id)
      .map(rec => ({ id: String(rec.id), data: rec, updated_at: new Date().toISOString() }));
      
    if (rows.length === 0) continue;
    
    if (isDryRun) {
      console.log(`  [DRY RUN] Would POST ${rows.length} rows to /rest/v1/${collection}`);
      continue;
    }

    const r = await fetch(`${url}/rest/v1/${encodeURIComponent(collection)}`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(rows)
    });

    if (!r.ok) {
      const text = await r.text();
      console.error(`  ERROR restoring ${collection}: HTTP ${r.status} ${text.slice(0, 300)}`);
    } else {
      console.log(`  OK: Restored ${rows.length} rows to ${collection}.`);
    }
  }
  
  console.log('Restore complete.');

} catch (err) {
  console.error('Failed to parse or restore backup:', err.message);
  process.exit(1);
}
