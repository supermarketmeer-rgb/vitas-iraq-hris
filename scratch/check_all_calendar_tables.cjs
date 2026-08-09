const mysql = require('mysql2/promise');

async function checkAllTables() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'vitasiraq_hris_db',
    port: 3306
  });

  try {
    const [tables] = await conn.query('SHOW TABLES');
    console.log('--- Current Tables in DB ---');
    console.log(tables.map(t => Object.values(t)[0]));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await conn.end();
  }
}

checkAllTables();
