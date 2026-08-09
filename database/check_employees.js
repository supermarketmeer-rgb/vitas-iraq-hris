import mysql from 'mysql2';
import config from './config.mjs';

const db = mysql.createPool({
  ...config,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const query = (sql, params) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
};

async function checkEmployees() {
  try {
    console.log('Connected to MySQL database: vitasiraq_hris_db');
    
    // Get total count
    const countResult = await query('SELECT COUNT(*) as count FROM employees');
    console.log(`\nTotal employees in database: ${countResult[0].count}`);
    
    // Get recent employees
    const employees = await query('SELECT id, employee_id, full_name_ar, full_name_en, created_at FROM employees ORDER BY created_at DESC LIMIT 10');
    
    console.log('\n=== Recent employees ===');
    employees.forEach(emp => {
      console.log(`ID: ${emp.id}, Employee ID: ${emp.employee_id}, Name: ${emp.full_name_ar} / ${emp.full_name_en}, Created: ${emp.created_at}`);
    });
    
    // Check table structure
    const columns = await query('SHOW COLUMNS FROM employees');
    console.log('\n=== Employees table columns ===');
    columns.forEach(col => {
      console.log(`${col.Field} - ${col.Type}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    db.end();
  }
}

checkEmployees();