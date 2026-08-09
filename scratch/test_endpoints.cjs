const http = require('http');

function get(path) {
  return new Promise((resolve) => {
    http.get(`http://localhost:5000${path}`, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        console.log(`GET ${path} -> Status: ${res.statusCode}`);
        if (res.statusCode === 200) {
          console.log('Data:', data.substring(0, 200));
        } else {
          console.log('Response body:', data);
        }
        resolve();
      });
    }).on('error', e => {
      console.log(`GET ${path} Error:`, e.message);
      resolve();
    });
  });
}

async function main() {
  await get('/api/settings/app');
  await get('/api/employees');
  await get('/api/company-profile/COMP-001');
}

main();
