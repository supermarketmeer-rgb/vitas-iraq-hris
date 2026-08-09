const mysql = require('mysql2/promise');

async function testUpdate(testData) {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'vitasiraq_hris_db',
    port: 3306
  });

  const updateFields = [];
  const updateValues = [];
  const allowedFields = [
    'company_name', 'company_name_en', 'logo_url', 'address', 'city', 
    'country', 'phone', 'email', 'website', 'tax_id', 'registration_number',
    'established_date', 'description'
  ];
  
  allowedFields.forEach(field => {
    if (testData[field] !== undefined) {
      updateFields.push(`${field} = ?`);
      updateValues.push(testData[field]);
    }
  });
  updateValues.push('COMP-001');

  const sql = `UPDATE company_profile SET ${updateFields.join(', ')} WHERE id = ?`;
  try {
    await conn.query(sql, updateValues);
    console.log('Update SUCCESSFUL');
  } catch (err) {
    console.error('Update FAILED:', err.message);
  } finally {
    await conn.end();
  }
}

console.log('Test 1: Empty string established_date');
testUpdate({ established_date: '' });
