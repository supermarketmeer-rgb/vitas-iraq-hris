import mysql from 'mysql2/promise';
import config from '../database/config.mjs';

async function main() {
  try {
    const db = await mysql.createConnection(config);
    console.log('Connected to MySQL');

    // Add is_emergency column if not exists
    try {
      await db.query(`
        ALTER TABLE company_holidays 
        ADD COLUMN is_emergency TINYINT(1) DEFAULT 0 COMMENT 'Is this an emergency holiday',
        ADD COLUMN scope ENUM('all_branches', 'specific_branches') DEFAULT 'all_branches' COMMENT 'Holiday scope'
      `);
      console.log('Added is_emergency and scope columns to company_holidays successfully!');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('Columns is_emergency / scope already exist.');
      } else {
        console.error('Error altering table company_holidays:', e.message);
      }
    }

    // Verify columns
    const [cols] = await db.query("SHOW COLUMNS FROM company_holidays");
    console.log('Current company_holidays columns:', cols.map(c => c.Field));

    await db.end();
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
