const mysql = require('mysql2/promise');
const http = require('http');

async function testDB() {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'vitasiraq_hris_db',
      port: 3306
    });

    console.log('--- app_settings Table Schema ---');
    try {
      const [cols] = await conn.query('DESCRIBE app_settings');
      console.log(cols);
    } catch (e) {
      console.error('Table app_settings describe error:', e.message);
    }

    try {
      const [rows] = await conn.query('SELECT * FROM app_settings');
      console.log('Rows count:', rows.length);
      console.log('Sample rows:', rows.slice(0, 5));
    } catch (e) {
      console.error('Table app_settings select error:', e.message);
    }

    await conn.end();
  } catch (err) {
    console.error('DB connection error:', err.message);
  }
}

function testAPI() {
  return new Promise((resolve) => {
    const postData = JSON.stringify({ setting_value: '15000' });
    const req = http.request('http://localhost:5000/api/settings/app/housing_allowance_married', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('\n--- API PUT Response ---');
        console.log('Status code:', res.statusCode);
        console.log('Data:', data);
        resolve();
      });
    });

    req.on('error', (err) => {
      console.error('API Error:', err.message);
      resolve();
    });

    req.write(postData);
    req.end();
  });
}

async function main() {
  await testDB();
  await testAPI();
}

main();
