const http = require('http');

http.get('http://localhost:5000/api/employees', (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    const list = JSON.parse(body);
    for (const emp of list) {
      console.log(`Emp ID: ${emp.id}, Name: ${emp.fullName}, photoUrl: ${emp.photoUrl}`);
    }
  });
});
