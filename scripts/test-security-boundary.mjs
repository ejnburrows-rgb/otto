import { spawn } from 'child_process';
import http from 'http';

async function run() {
  console.log('--- TEST: Server Auth Boundary ---');

  // Start the local test server
  const server = spawn('node', ['scripts/local-server.js'], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 1500)); // wait for server to bind

  let failed = false;

  const req = (path, method = 'POST', body = null) => {
    return new Promise((resolve) => {
      const options = {
        hostname: 'localhost',
        port: 3000,
        path,
        method,
        headers: {}
      };
      if (body) {
        options.headers['Content-Type'] = 'application/json';
      }
      const request = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data }));
      });
      request.on('error', () => resolve({ status: 500, data: '' }));
      if (body) request.write(JSON.stringify(body));
      request.end();
    });
  };

  try {
    const endpoints = [
      { path: '/api/data', method: 'GET' },
      { path: '/api/data', method: 'POST', body: { collection: 'jobs', records: [] } },
      { path: '/api/photos', method: 'POST', body: { fileId: '123' } },
      { path: '/api/claude', method: 'POST', body: { messages: [] } },
      { path: '/api/nvidia', method: 'POST', body: { messages: [] } },
      { path: '/api/notify', method: 'POST', body: { channel: 'sms' } },
      { path: '/api/quickbooks', method: 'POST', body: { action: 'sync' } }
    ];

    for (const ep of endpoints) {
      console.log(`Testing ${ep.method} ${ep.path}...`);
      const { status, data } = await req(ep.path, ep.method, ep.body);
      
      if (status !== 401 && status !== 503) {
        console.error(`FAIL: ${ep.path} returned ${status}, expected 401 or 503.`);
        failed = true;
      }
      if (!data.includes('server_auth_not_configured') && !data.includes('not_connected')) {
        console.error(`FAIL: ${ep.path} returned unexpected body: ${data}`);
        failed = true;
      }
      if (status === 401) {
        console.log(`OK: ${ep.path} refused access safely.`);
      }
    }

  } finally {
    server.kill();
  }

  if (failed) process.exit(1);
  console.log('--- ALL AUTH BOUNDARY TESTS PASSED ---');
}

run();
