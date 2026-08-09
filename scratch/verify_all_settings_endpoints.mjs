import http from 'http';

function fetchApi(path) {
  return new Promise((resolve) => {
    http.get(`http://localhost:5000${path}`, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, count: Array.isArray(json) ? json.length : Object.keys(json).length, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    }).on('error', err => resolve({ error: err.message }));
  });
}

async function test() {
  const endpoints = [
    '/api/branches',
    '/api/settings/positions',
    '/api/settings/departments',
    '/api/settings/contract-types',
    '/api/settings/status-changes',
    '/api/settings/trainings',
    '/api/settings/app'
  ];

  for (const ep of endpoints) {
    const res = await fetchApi(ep);
    console.log(`Endpoint ${ep} -> Status: ${res.status}, Item count: ${res.count}`);
  }
}

test();
