const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'vitasiraq_hris_db',
    port: 3306
  });

  const [rows] = await conn.query('SELECT * FROM company_profile');
  console.log('Company Profile rows count:', rows.length);
  console.log('Rows:', rows);
  await conn.end();
}

main().catch(console.error);
