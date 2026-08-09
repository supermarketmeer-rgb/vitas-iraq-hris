const http = require('http');

const data = JSON.stringify({
  housing_allowance_default: '250000',
  child_allowance_default: '50000'
});

const req = http.request('http://localhost:5000/api/settings/app/bulk', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  let body = '';
  console.log('Status Code:', res.statusCode);
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('Response Body:', body));
});

req.on('error', (e) => {
  console.error('Request Error:', e.message);
});

req.write(data);
req.end();
