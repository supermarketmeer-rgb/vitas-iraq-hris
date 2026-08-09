const http = require('http');

const testData = JSON.stringify({
  id: "12",
  employee_id: "EMP-12",
  badge_no: "B-101",
  full_name_ar: "مصطفى المير الحسيني",
  full_name_en: "Mustafa Meer",
  email: "",
  personal_email: "",
  mobile: "07700000000",
  emergency_mobile: "",
  department: "الموارد البشرية",
  position_ar: "مدير HR",
  position_en: "HR Manager",
  location_ar: "بغداد",
  location_en: "Baghdad",
  dob: "1990-01-01",
  gender: "male",
  marital_status: "married",
  photo_url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  status: "active"
});

const req = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/employees',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(testData)
  }
}, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('RESPONSE:', body));
});

req.on('error', (e) => {
  console.error(`PROBLEM WITH REQUEST: ${e.message}`);
});

req.write(testData);
req.end();
