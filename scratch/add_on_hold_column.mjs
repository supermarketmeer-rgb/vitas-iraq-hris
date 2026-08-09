import mysql from 'mysql2/promise';
import config from '../database/config.mjs';

async function main() {
  try {
    const conn = await mysql.createConnection(config);
    console.log('Connected to MySQL vitasiraq_hris_db');
    
    // Add on_hold to employees table
    try {
      await conn.query('ALTER TABLE employees ADD COLUMN on_hold TINYINT(1) DEFAULT 0');
      console.log('Added on_hold column to employees table successfully');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('on_hold column already exists in employees table');
      } else {
        console.error('Error adding on_hold to employees:', err.message);
      }
    }

    // Check if payroll_finalized_rows exists and add on_hold column if present
    const [tables] = await conn.query("SHOW TABLES LIKE 'payroll_finalized_rows'");
    if (tables.length > 0) {
      try {
        await conn.query('ALTER TABLE payroll_finalized_rows ADD COLUMN on_hold TINYINT(1) DEFAULT 0');
        console.log('Added on_hold column to payroll_finalized_rows table');
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log('on_hold column already exists in payroll_finalized_rows');
        } else {
          console.error('Error adding on_hold to payroll_finalized_rows:', err.message);
        }
      }
    }

    await conn.end();
  } catch (e) {
    console.error('Database alter error:', e.message);
  }
}
main();
