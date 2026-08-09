const http = require('http');

http.get('http://localhost:5000/api/company-profile', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('GET company-profile response:', data);
  });
}).on('error', (err) => {
  console.error('Error fetching API:', err.message);
});
