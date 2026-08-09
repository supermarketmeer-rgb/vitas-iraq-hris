const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'vitasiraq_hris_db',
    port: 3306
  });

  const [rows] = await conn.query('SELECT id, full_name_ar, photo_url, LENGTH(photo) as photo_len FROM employees WHERE id = 12 OR id = 7');
  console.log('ROWS:', rows);
  await conn.end();
}

main().catch(console.error);
