const http = require('http');

http.get('http://localhost:5000/api/employees', (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const employees = JSON.parse(body);
    console.log('TOTAL EMPLOYEES FETCHED:', employees.length);
    const emp12 = employees.find(e => String(e.id) === '12' || e.fullName === 'مصطفى المير الحسيني');
    console.log('EMPLOYEE 12 DETAILS:', JSON.stringify(emp12, null, 2));
  });
});
