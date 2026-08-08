// Simple static server for testing Otto CRM locally on http://localhost:8000
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 8000);
const ROOT = path.join(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  const filePath = path.join(ROOT, reqPath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found');
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[local-server] Serving Otto CRM at http://localhost:${PORT}`);
  console.log(`[local-server] Root: ${ROOT}`);
});

server.on('error', (e) => console.error('[local-server] error', e));