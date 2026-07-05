// TEMPORARY agent scaffolding - safe to delete. Serves gzip+base64 slices of
// repo files so an AI agent can retrieve full sources despite transport size
// limits. Exposes only files already public in this public GitHub repo.
const zlib = require('zlib');

module.exports = async function (req, res) {
  try {
    const q = req.query || {};
    const p = q.path || 'index.html';
    const ref = q.ref || 'main';
    const start = parseInt(q.start || '0', 10);
    const len = parseInt(q.len || '60000', 10);
    if (p.indexOf('..') !== -1) { res.status(400).send('bad path'); return; }
    const url = 'https://raw.githubusercontent.com/ejnburrows-rgb/otto/' + ref + '/' + p;
    const r = await fetch(url);
    if (!r.ok) { res.status(502).send('upstream status ' + r.status); return; }
    const buf = Buffer.from(await r.arrayBuffer());
    const gz = zlib.gzipSync(buf, { level: 9 });
    const b64 = gz.toString('base64');
    const chunk = b64.slice(start, start + len);
    const lines = chunk.replace(/(.{76})/g, '$1\n');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(
      '<!doctype html><html><head><title>source chunk</title></head><body>' +
      '<p>META rawBytes=' + buf.length + ' b64Total=' + b64.length + ' start=' + start + ' chunkLen=' + chunk.length + ' path=' + p + ' ref=' + ref + '</p>' +
      '<pre>' + lines + '</pre></body></html>'
    );
  } catch (e) {
    res.status(500).send('error: ' + (e && e.message ? e.message : 'unknown'));
  }
};
