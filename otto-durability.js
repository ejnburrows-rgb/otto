/* OTTO durability guard — catches direct state mutations that bypass CRUD helpers
   and keeps the 24-hour backup check alive while the app remains open. */
(function () {
  'use strict';

  let lastFingerprint = '';
  let backupBusy = false;

  function fingerprint() {
    try {
      if (typeof db === 'undefined' || !db) return '';
      const meta = Object.assign({}, db.meta || {});
      // save() itself advances this timestamp; exclude it so autosave cannot loop.
      delete meta.updated;
      return JSON.stringify(Object.assign({}, db, { meta }));
    } catch (_) {
      return '';
    }
  }

  function autosaveIfChanged() {
    try {
      if (typeof save !== 'function' || typeof db === 'undefined' || !db) return;
      const next = fingerprint();
      if (!next) return;
      if (!lastFingerprint) { lastFingerprint = next; return; }
      if (next === lastFingerprint) return;
      lastFingerprint = next;
      save();
    } catch (_) {}
  }

  async function checkDailyBackup() {
    if (backupBusy) return;
    if (typeof maybeAutoBackup !== 'function') return;
    backupBusy = true;
    try { await maybeAutoBackup(); } catch (_) {}
    finally { backupBusy = false; }
  }

  function boot() {
    lastFingerprint = fingerprint();
    checkDailyBackup();
    // A lightweight safety net for any direct db mutation that forgot save().
    setInterval(autosaveIfChanged, 1500);
    // Re-check hourly; maybeAutoBackup itself only creates a snapshot after 24h.
    setInterval(checkDailyBackup, 60 * 60 * 1000);
    document.addEventListener('visibilitychange', () => {
      autosaveIfChanged();
      if (document.visibilityState === 'visible') checkDailyBackup();
    });
    window.addEventListener('pagehide', autosaveIfChanged);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();

  window.__ottoDurability = { autosaveIfChanged, checkDailyBackup, fingerprint };
})();
