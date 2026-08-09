import mysql from 'mysql2/promise';
import config from '../database/config.mjs';

async function check() {
  const conn = await mysql.createConnection(config);
  
  const [empCols] = await conn.query('DESCRIBE employees');
  console.log('Employees table columns:', empCols.map(c => `${c.Field} (${c.Type})`));

  const [branches] = await conn.query('SELECT * FROM branches');
  console.log('Branches:', branches);

  const [positions] = await conn.query('SELECT * FROM positions');
  console.log('Positions:', positions);

  const [departments] = await conn.query('SELECT * FROM departments');
  console.log('Departments:', departments);

  const [offices] = await conn.query('SHOW TABLES LIKE "settings_offices"');
  console.log('settings_offices exist:', offices.length > 0);

  // Check if there are other settings tables or columns
  const [tables] = await conn.query('SHOW TABLES');
  console.log('All tables:', tables.map(t => Object.values(t)[0]));

  await conn.end();
}

check().catch(console.error);
