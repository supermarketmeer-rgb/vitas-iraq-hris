const mysql = require('mysql2/promise');
const config = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'vitasiraq_hris_db',
  port: 3306
};

async function testBulkUpsert() {
  const conn = await mysql.createConnection(config);
  try {
    const settings = {
      housing_allowance_default: '250000',
      child_allowance_default: '50000',
      annual_leave_balance: '30'
    };

    const entries = Object.entries(settings);
    const values = entries.map(([key, value]) => [
      key,
      value !== undefined && value !== null ? String(value) : ''
    ]);

    console.log('Values array:', values);
    const sql = `
      INSERT INTO app_settings (setting_key, setting_value)
      VALUES ?
      ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
    `;
    const start = Date.now();
    const [result] = await conn.query(sql, [values]);
    console.log('Upsert succeeded in', Date.now() - start, 'ms!');
    console.log('Result:', result);
  } catch (err) {
    console.error('Upsert failed:', err.message);
  } finally {
    await conn.end();
  }
}

testBulkUpsert();
