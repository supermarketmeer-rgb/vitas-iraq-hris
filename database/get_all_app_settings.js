import mysql from 'mysql2';
import config from './config.mjs';

const db = mysql.createConnection(config);

db.connect(async (err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL database: vitasiraq_hris_db');

  try {
    // Get all data
    const data = await new Promise((resolve, reject) => {
      db.query('SELECT * FROM app_settings', (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    console.log('\n=== All data from app_settings ===');
    data.forEach(row => {
      console.log(`${row.setting_key} = ${row.setting_value} (${row.setting_type}) - ${row.category}`);
    });

    db.end();
  } catch (error) {
    console.error('Error:', error);
    db.end();
  }
});