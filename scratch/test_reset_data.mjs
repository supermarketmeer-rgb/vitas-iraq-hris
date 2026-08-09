import mysql from 'mysql2/promise';
import config from '../database/config.mjs';

async function testReset() {
  const conn = await mysql.createConnection(config);
  try {
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');

    const [tables] = await conn.query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);

    console.log('Clearing tables count:', tableNames.length);

    for (const table of tableNames) {
      if (table === 'users') {
        await conn.query("DELETE FROM users WHERE role NOT IN ('Super Admin', 'super_admin') AND username NOT IN ('admin', 'superadmin')");
      } else {
        await conn.query(`DELETE FROM \`${table}\``);
      }
    }

    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    const [empCount] = await conn.query('SELECT COUNT(*) as cnt FROM employees');
    console.log('Employees count after reset:', empCount[0].cnt);
  } catch (err) {
    console.error('Reset error:', err);
  } finally {
    await conn.end();
  }
}

testReset();
