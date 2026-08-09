const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'vitasiraq_hris_db',
    port: 3306
  });

  const [cols] = await conn.query('SHOW COLUMNS FROM employees');
  console.log('COLUMNS:', cols);
  await conn.end();
}

main().catch(console.error);
