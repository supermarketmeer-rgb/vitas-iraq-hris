import mysql from 'mysql2/promise';
import config from '../database/config.mjs';

async function testImport() {
  const conn = await mysql.createConnection(config);
  try {
    // Test inserting a new employee
    const [cols] = await conn.query('SHOW COLUMNS FROM employees');
    const columnNames = cols.map(c => c.Field);
    console.log('Employees table column count:', columnNames.length);

    const testEmp = {
      employee_id: `VTS-${Math.floor(1000 + Math.random() * 9000)}`,
      badge_no: `B-${Math.floor(1000 + Math.random() * 9000)}`,
      full_name_ar: "موظف تجريبي جديد",
      full_name_en: "New Test Employee",
      email: `test-${Date.now()}@vitasiraq.local`,
      gender: "male",
      marital_status: "single",
      nationality: "عراقي",
      department: "قسم الائتمان",
      position_ar: "محاسب",
      branch: "فرع بغداد",
      status: "Active"
    };

    const validCols = Object.keys(testEmp).filter(c => columnNames.includes(c));
    const insertVals = validCols.map(c => testEmp[c]);
    const placeholders = validCols.map(() => '?').join(', ');

    const [res] = await conn.query(`INSERT INTO employees (${validCols.join(', ')}) VALUES (${placeholders})`, insertVals);
    console.log('Inserted test employee successfully, insertId:', res.insertId);

    // Clean up test employee
    await conn.query('DELETE FROM employees WHERE id = ?', [res.insertId]);
    console.log('Cleaned up test employee');
  } catch (err) {
    console.error('Import test error:', err);
  } finally {
    await conn.end();
  }
}

testImport();
