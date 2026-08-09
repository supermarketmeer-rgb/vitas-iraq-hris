import mysql from 'mysql2/promise';
import config from '../database/config.mjs';

async function testDB() {
  try {
    const conn = await mysql.createConnection(config);
    console.log('Connected to MySQL successfully!');

    const [tables] = await conn.query('SHOW TABLES');
    console.log('Tables in database:', tables.map(t => Object.values(t)[0]));

    // Check count of employees
    const [empRows] = await conn.query('SELECT COUNT(*) as cnt FROM employees');
    console.log('Employee count in DB:', empRows[0].cnt);

    await conn.end();
  } catch (err) {
    console.error('MySQL Connection error:', err.message);
  }
}

testDB();
