import mysql from 'mysql2/promise';
import config from '../database/config.mjs';

async function check() {
  const conn = await mysql.createConnection(config);
  
  const [rows] = await conn.query('SELECT * FROM job_vacancies');
  console.log(`=== JOB VACANCIES COUNT: ${rows.length} ===`);
  console.log(rows);

  await conn.end();
}

check().catch(console.error);
