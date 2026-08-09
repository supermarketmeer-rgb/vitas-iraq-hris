const mysql = require('mysql2/promise');

async function testHolidaysTable() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'vitasiraq_hris_db',
    port: 3306
  });

  try {
    console.log('--- Checking company_holidays table ---');
    try {
      const [cols] = await conn.query('DESCRIBE company_holidays');
      console.log('company_holidays columns:', cols);
    } catch (e) {
      console.error('DESCRIBE company_holidays ERROR:', e.message);
    }

    try {
      const [tables] = await conn.query("SHOW TABLES LIKE '%holiday%'");
      console.log('Holiday related tables:', tables);
    } catch (e) {
      console.error('SHOW TABLES ERROR:', e.message);
    }

  } catch (err) {
    console.error('DB Error:', err.message);
  } finally {
    await conn.end();
  }
}

testHolidaysTable();
