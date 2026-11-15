/**
 * Migration Script: Move Lebanon staff from `employees` to `lebanon_employees`
 * Date: 2026-11-14
 * Task: نقل كادر لبنان من جدول الموظفين الى جدول موظفي لبنان
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrateLebanonStaff() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vitasiraq_hris_db'
  });

  console.log('--- STARTING LEBANON STAFF MIGRATION TRANSACTION ---');
  await conn.beginTransaction();

  try {
    // 1. Fetch Lebanon employees
    const [lebEmps] = await conn.query(`
      SELECT * FROM employees 
      WHERE branch = 'مكتب لبنان (ATAS)' OR nationality = 'Lebanese'
    `);
    console.log(`Found ${lebEmps.length} Lebanon employees to migrate.`);

    if (lebEmps.length === 0) {
      console.log('No Lebanon employees found in employees table. Migration may already have been executed.');
      await conn.rollback();
      await conn.end();
      return;
    }

    const lebIds = lebEmps.map(e => e.id);

    // 2. Create backup tables
    await conn.query('CREATE TABLE IF NOT EXISTS _backup_employees_lebanon LIKE employees');
    await conn.query('DELETE FROM _backup_employees_lebanon');
    await conn.query('INSERT INTO _backup_employees_lebanon SELECT * FROM employees WHERE id IN (?)', [lebIds]);
    console.log(`Backed up ${lebEmps.length} employees to _backup_employees_lebanon.`);

    await conn.query('CREATE TABLE IF NOT EXISTS _backup_employee_children_lebanon LIKE employee_children');
    await conn.query('DELETE FROM _backup_employee_children_lebanon');
    const [childrenToBackup] = await conn.query('SELECT * FROM employee_children WHERE employee_id IN (?)', [lebIds]);
    if (childrenToBackup.length > 0) {
      await conn.query('INSERT INTO _backup_employee_children_lebanon SELECT * FROM employee_children WHERE employee_id IN (?)', [lebIds]);
      console.log(`Backed up ${childrenToBackup.length} child records to _backup_employee_children_lebanon.`);
    }

    // 3. Insert into lebanon_employees
    const insertSql = `
      INSERT INTO lebanon_employees (
        id, employee_id, badge_no, waid, name, name_en, email, phone,
        country, city, branch, department, job_title, job_title_en,
        direct_manager_id, is_supervisor, can_supervise_iraq, hire_date,
        contract_type, status, basic_salary, currency, social_security_nssf,
        tax_id, address, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Lebanon', 'Beirut', 'مكتب بيروت - لبنان', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'USD', ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        name_en = VALUES(name_en),
        badge_no = VALUES(badge_no),
        waid = VALUES(waid),
        email = VALUES(email),
        phone = VALUES(phone),
        branch = VALUES(branch),
        department = VALUES(department),
        job_title = VALUES(job_title),
        job_title_en = VALUES(job_title_en),
        direct_manager_id = VALUES(direct_manager_id),
        is_supervisor = VALUES(is_supervisor),
        can_supervise_iraq = VALUES(can_supervise_iraq),
        hire_date = VALUES(hire_date),
        contract_type = VALUES(contract_type),
        status = VALUES(status),
        basic_salary = VALUES(basic_salary),
        currency = VALUES(currency),
        address = VALUES(address),
        notes = VALUES(notes)
    `;

    for (const r of lebEmps) {
      let hireDate = null;
      if (r.original_start_date) {
        const d = new Date(r.original_start_date);
        hireDate = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : null;
      } else if (r.contract_start_date) {
        const d = new Date(r.contract_start_date);
        hireDate = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : null;
      }

      let email = r.email;
      if (email && email.includes('@vitasiraq.local')) {
        email = null;
      }

      let status = 'Active';
      if (r.status) {
        const st = r.status.toLowerCase();
        if (st.includes('term') || st.includes('exit')) status = 'Terminated';
        else if (st.includes('inact')) status = 'Inactive';
        else if (st.includes('leave')) status = 'On_Leave';
        else status = 'Active';
      }

      const finalId = `LBN_${r.employee_id || r.id}`;
      const empId = r.employee_id || `LBN-${r.id}`;

      const params = [
        finalId,
        empId,
        r.badge_no || null,
        r.waid || null,
        r.full_name_ar || r.full_name_en,
        r.full_name_en || r.full_name_ar,
        email,
        r.phone || r.mobile || null,
        r.department || 'الإدارة الإقليمية',
        r.position_ar || r.position || 'موظف إقليمي',
        r.position_en || r.position || 'Regional Staff',
        r.supervisor_name || r.admin_line || null,
        1, // is_supervisor
        1, // can_supervise_iraq
        hireDate,
        r.term_of_contract || 'عقد دوام كامل',
        status,
        Number(r.basic_salary) || Number(r.salary) || 0.00,
        null, // social_security_nssf
        null, // tax_id
        'Beirut, Lebanon',
        `نُقل من جدول الموظفين العام (المعرف الأصلي: ${r.id}, الرقم الوظيفي: ${r.employee_id})`
      ];

      await conn.query(insertSql, params);
    }

    // 4. Delete dependent child records
    if (childrenToBackup.length > 0) {
      await conn.query('DELETE FROM employee_children WHERE employee_id IN (?)', [lebIds]);
    }

    // 5. Delete from employees
    const [delRes] = await conn.query('DELETE FROM employees WHERE id IN (?)', [lebIds]);
    console.log(`Deleted ${delRes.affectedRows} Lebanon employees from employees table.`);

    await conn.commit();
    console.log('--- TRANSACTION COMMITTED SUCCESSFULLY! ---');

    const [lebCount] = await conn.query('SELECT count(*) as count FROM lebanon_employees');
    const [empCount] = await conn.query('SELECT count(*) as count FROM employees');
    console.log(`Current count in lebanon_employees: ${lebCount[0].count}`);
    console.log(`Current count in employees: ${empCount[0].count}`);

  } catch (err) {
    console.error('ERROR during migration, rolling back:', err);
    await conn.rollback();
  } finally {
    await conn.end();
  }
}

if (require.main === module) {
  migrateLebanonStaff().catch(console.error);
}

module.exports = { migrateLebanonStaff };

