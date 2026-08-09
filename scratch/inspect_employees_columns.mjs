import mysql from 'mysql2/promise';
import config from '../database/config.mjs';

async function inspect() {
  const conn = await mysql.createConnection(config);
  const [cols] = await conn.query('SHOW COLUMNS FROM employees');
  console.log('Employees Columns:', cols.map(c => c.Field));
  await conn.end();
}

inspect().catch(console.error);
