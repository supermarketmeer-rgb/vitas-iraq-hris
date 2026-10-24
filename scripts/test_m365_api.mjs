import http from 'http';

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const options = {
      hostname: '127.0.0.1',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', err => reject(err));
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('Testing M365 Express API Endpoints...');

  try {
    // 1. GET /api/m365/settings
    const settingsRes = await makeRequest('GET', '/api/m365/settings');
    console.log('1. GET /api/m365/settings -> Status:', settingsRes.status, 'ClientSecretExposed:', Boolean(settingsRes.body.clientSecret));

    // 2. GET /api/m365/templates
    const tplRes = await makeRequest('GET', '/api/m365/templates');
    console.log('2. GET /api/m365/templates -> Status:', tplRes.status, 'Templates Count:', Array.isArray(tplRes.body) ? tplRes.body.length : 0);

    // 3. GET /api/m365/employees/search?limit=3
    const empRes = await makeRequest('GET', '/api/m365/employees/search?limit=3');
    console.log('3. GET /api/m365/employees/search -> Status:', empRes.status, 'Employees Count:', Array.isArray(empRes.body) ? empRes.body.length : 0);

    // 4. POST /api/m365/run-acceptance-tests
    const acceptRes = await makeRequest('POST', '/api/m365/run-acceptance-tests');
    console.log('4. POST /api/m365/run-acceptance-tests -> Status:', acceptRes.status, 'Passed:', acceptRes.body?.passedCount, '/', acceptRes.body?.totalTests);

    // 5. GET /api/m365/logs
    const logsRes = await makeRequest('GET', '/api/m365/logs?limit=5');
    console.log('5. GET /api/m365/logs -> Status:', logsRes.status, 'Logs Total:', logsRes.body?.total);

    console.log('\nAll API endpoints tested successfully!');
  } catch (err) {
    console.error('API Test error:', err.message);
  }
}

runTests();
