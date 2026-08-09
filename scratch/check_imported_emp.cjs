const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'vitasiraq_hris_db',
    port: 3306
  });

  const [rows] = await conn.query('SELECT id, employee_id, badge_no, full_name_ar, full_name_en, email, status, position_ar, location_ar, department FROM employees WHERE id IN (264, 265)');
  console.log('VERIFIED IMPORTED EMPLOYEES IN DB:', JSON.stringify(rows, null, 2));
  
  // Clean up test rows
  await conn.query('DELETE FROM employees WHERE id IN (264, 265)');
  console.log('Cleaned test rows 264, 265');
  await conn.end();
}

main().catch(console.error);
