import mysql from 'mysql2/promise';
import config from '../database/config.mjs';

async function sync() {
  const conn = await mysql.createConnection(config);

  // Check unique values in employees table
  const [empBranches] = await conn.query('SELECT DISTINCT branch, branch_en FROM employees WHERE branch IS NOT NULL AND branch != ""');
  console.log('Emp Branches:', empBranches);

  const [empDepts] = await conn.query('SELECT DISTINCT department FROM employees WHERE department IS NOT NULL AND department != ""');
  console.log('Emp Departments:', empDepts);

  const [empPositions] = await conn.query('SELECT DISTINCT position_ar, position_en FROM employees WHERE (position_ar IS NOT NULL AND position_ar != "") OR (position_en IS NOT NULL AND position_en != "")');
  console.log('Emp Positions:', empPositions);

  const [empContracts] = await conn.query('SELECT DISTINCT term_of_contract FROM employees WHERE term_of_contract IS NOT NULL AND term_of_contract != ""');
  console.log('Emp Contract Terms:', empContracts);

  const [empStatuses] = await conn.query('SELECT DISTINCT status FROM employees WHERE status IS NOT NULL AND status != ""');
  console.log('Emp Statuses:', empStatuses);

  await conn.end();
}

sync().catch(console.error);
