import mysql from 'mysql2/promise';
import config from '../database/config.mjs';

async function testFullHolidayFlow() {
  try {
    const db = await mysql.createConnection(config);
    console.log('Connected to MySQL');

    const holidayId = `HOL-TEST-${Date.now()}`;
    const id = `H-TEST-${Date.now()}`;
    const sql = `
      INSERT INTO company_holidays (
        id, holiday_id, name_ar, name_en, description_ar, description_en,
        holiday_date, is_recurring, holiday_type, is_paid, is_emergency, scope, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      id,
      holidayId,
      'عطلة اختبارية كاملة',
      'Full Test Holiday',
      'وصف العطلة',
      'Holiday description',
      '2026-12-31',
      1,
      'emergency',
      1,
      1,
      'specific_branches',
      'ADMIN001'
    ];

    await db.query(sql, params);
    console.log('Inserted holiday:', id);

    // Verify row
    const [rows] = await db.query('SELECT * FROM company_holidays WHERE id = ?', [id]);
    console.log('Queried row:', rows[0]);

    // Clean up test row
    await db.query('DELETE FROM company_holidays WHERE id = ?', [id]);
    console.log('Cleaned up test holiday!');

    await db.end();
  } catch (err) {
    console.error('Error in testFullHolidayFlow:', err);
  }
}

testFullHolidayFlow();
