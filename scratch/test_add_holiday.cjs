const http = require('http');

const data = JSON.stringify({
  name_ar: 'عطلة تجريبية',
  name_en: 'Test Holiday',
  description_ar: 'وصف تجريبي',
  description_en: 'Test description',
  holiday_date: '2026-12-25',
  is_recurring: true,
  holiday_type: 'national',
  is_paid: true,
  is_emergency: false,
  scope: 'all_branches',
  created_by: 'ADMIN001'
});

const req = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/calendar/holidays',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
}, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('RESPONSE:', body);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(data);
req.end();
