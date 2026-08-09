const mysql = require('mysql2');
const pool = mysql.createPool({ host: 'localhost', user: 'root', password: '', database: 'vitasiraq_hris_db' });

const alterQueries = [
  'ALTER TABLE positions ADD COLUMN name VARCHAR(255) NULL',
  'ALTER TABLE positions ADD COLUMN name_ar VARCHAR(255) NULL',
  'ALTER TABLE positions ADD COLUMN name_en VARCHAR(255) NULL',
  'ALTER TABLE positions ADD COLUMN status VARCHAR(50) DEFAULT "Active"',
  'ALTER TABLE positions ADD COLUMN sort_order INT DEFAULT 0',
  'ALTER TABLE positions ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
];

async function runAlters() {
  for (const q of alterQueries) {
    await new Promise((res) => pool.query(q, err => {
      if (err) console.log('Column query message:', err.message);
      else console.log('OK alter');
      res();
    }));
  }
  pool.query('SHOW COLUMNS FROM positions', (err, rows) => {
    console.log('Updated positions columns:', rows.map(r => r.Field));
    process.exit();
  });
}
runAlters();
